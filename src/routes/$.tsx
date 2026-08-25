import { createFileRoute, Link } from "@tanstack/react-router";
import { classifyLegacyPath } from "@/lib/legacy-url";
import { resolveLegacyCompanySlug } from "@/lib/legacy-url.server";

function htmlShell(opts: { status: number; title: string; body: string }) {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, follow" />
<title>${opts.title} | Companies House Cyprus</title>
<style>
  :root { color-scheme: dark }
  body { margin:0; min-height:100vh; display:grid; place-items:center; background:#0b1c2c;
    color:#e9eef4; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; padding:24px }
  .card { max-width:38rem; text-align:center }
  h1 { font-size:1.6rem; margin:0 0 .75rem }
  p { color:#a9b7c6; line-height:1.6; margin:0 0 1rem }
  a.btn { display:inline-block; margin-top:.5rem; padding:.6rem 1.1rem; border-radius:.5rem;
    background:#b87333; color:#fff; text-decoration:none; font-weight:600 }
  a { color:#d9a066 }
</style></head><body><div class="card">${opts.body}
<a class="btn" href="/">Search the registry</a></div></body></html>`,
    {
      status: opts.status,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=3600",
        "x-robots-tag": "noindex, follow",
      },
    },
  );
}

async function handleLegacy(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const legacy = classifyLegacyPath(url.pathname, url.search);

  if (legacy) {
    const slug = await resolveLegacyCompanySlug(legacy.token);
    if (slug) {
      return new Response(null, {
        status: 301,
        headers: {
          location: `/company/${slug}`,
          "cache-control": "public, max-age=86400",
        },
      });
    }
    return htmlShell({
      status: 410,
      title: "Page removed",
      body: `<h1>This page no longer exists</h1>
<p>The address you followed came from our previous website and was generated in error, so there is no
equivalent page to show. Cyprus company records are still available &mdash; search by company name or
registration number.</p>`,
    });
  }

  return htmlShell({
    status: 404,
    title: "Page not found",
    body: `<h1>Page not found</h1>
<p>The page you're looking for doesn't exist or has been moved.</p>`,
  });
}

export const Route = createFileRoute("/$")({
  server: {
    handlers: {
      GET: async ({ request }) => handleLegacy(request),
      HEAD: async ({ request }) => {
        const response = await handleLegacy(request);
        return new Response(null, { status: response.status, headers: response.headers });
      },
    },
  },
  component: NotFoundPage,
});

function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-copper px-4 py-2 text-sm font-medium text-white"
        >
          Search the registry
        </Link>
      </div>
    </div>
  );
}
