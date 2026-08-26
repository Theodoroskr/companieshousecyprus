import { describe, it, expect, vi, afterEach } from "vitest";
import { createResumableBody, collectStream } from "@/lib/sanctions.server";

function streamOf(chunks: string[], failAfter?: number) {
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (failAfter !== undefined && i === failAfter) {
        controller.error(new Error("connection reset"));
        return;
      }
      if (i >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(new TextEncoder().encode(chunks[i]!));
      i += 1;
    },
  });
}

function res(body: ReadableStream<Uint8Array>, headers: Record<string, string>, status = 200, url = "https://src/x.xml") {
  const r = new Response(body, { status, headers });
  Object.defineProperty(r, "url", { value: url });
  return r;
}

afterEach(() => vi.restoreAllMocks());

describe("resumable sanctions download", () => {
  it("passes a clean stream through untouched", async () => {
    const first = res(streamOf(["abc", "def"]), { "content-length": "6", "accept-ranges": "bytes" });
    const out = await collectStream(createResumableBody(first, "https://src/x.xml").stream);
    expect(new TextDecoder().decode(out)).toBe("abcdef");
  });

  it("resumes from the last received byte with a Range request", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const range = new Headers(init?.headers).get("Range");
      expect(range).toBe("bytes=3-");
      expect(new Headers(init?.headers).get("If-Range")).toBe('"v1"');
      return res(streamOf(["def"]), { "content-range": "bytes 3-5/6" }, 206);
    });
    vi.stubGlobal("fetch", fetchMock as never);
    const first = res(streamOf(["abc"], 1), { "content-length": "6", "accept-ranges": "bytes", etag: '"v1"' });
    const download = createResumableBody(first, "https://src/x.xml");
    const out = await collectStream(download.stream);
    expect(new TextDecoder().decode(out)).toBe("abcdef");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(download.resumeLog[0]?.offset).toBe(3);
  });

  it("fails instead of splicing when the server ignores the range request", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => res(streamOf(["abcdef"]), { "content-length": "6" }, 200)) as never);
    const first = res(streamOf(["abc"], 1), { "content-length": "6", "accept-ranges": "bytes", etag: '"v1"' });
    const download = createResumableBody(first, "https://src/x.xml");
    await expect(collectStream(download.stream)).rejects.toThrow(/connection reset/);
    expect(download.resumeLog[0]?.outcome).toContain("HTTP 200");
  });

  it("treats a short body as an interruption and resumes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => res(streamOf(["def"]), { "content-range": "bytes 3-5/6" }, 206)) as never,
    );
    const first = res(streamOf(["abc"]), { "content-length": "6", "accept-ranges": "bytes" });
    const out = await collectStream(createResumableBody(first, "https://src/x.xml").stream);
    expect(new TextDecoder().decode(out)).toBe("abcdef");
  });
});
