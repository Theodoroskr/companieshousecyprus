import { createServerFn } from "@tanstack/react-start";

export const getDirectoryOverview = createServerFn({ method: "GET" }).handler(async () => {
  const { readDirectoryOverview } = await import("@/lib/directory.server");
  return readDirectoryOverview();
});

export const listDirectorySignalCompanies = createServerFn({ method: "GET" })
  .validator((data: { signal: string; page: number }) => data)
  .handler(async ({ data }) => {
    const { readDirectorySignalPage } = await import("@/lib/directory.server");
    return readDirectorySignalPage(data.signal, data.page);
  });
