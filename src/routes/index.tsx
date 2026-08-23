import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getCompanyCount, getDistricts } from "@/lib/companies.functions";
import { Link } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const homeQueryOptions = () =>
  queryOptions({
    queryKey: ["home"],
    queryFn: async () => {
      const [count, districts] = await Promise.all([getCompanyCount(), getDistricts()]);
      return { count, districts };
    },
  });

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(homeQueryOptions());
  },
  head: () => ({
    meta: [
      { title: "Companies House Cyprus | Cyprus Registrar Directory" },
      { name: "description", content: "Search and browse Cyprus companies from the official Registrar of Companies. Company profiles, officials, addresses, and statuses." },
      { property: "og:title", content: "Companies House Cyprus | Cyprus Registrar Directory" },
      { property: "og:description", content: "Search and browse Cyprus companies from the official Registrar of Companies." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data } = useSuspenseQuery(homeQueryOptions());
  const [q, setQ] = useState("");
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Companies House Cyprus</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Search and browse {data.count.toLocaleString()} companies from the Cyprus Registrar of Companies.
        </p>
      </div>

      <form
        className="mx-auto mt-8 flex max-w-2xl gap-2"
        action="/search"
        method="get"
        onSubmit={(e) => {
          e.preventDefault();
          window.location.href = `/search?q=${encodeURIComponent(q)}`;
        }}
      >
        <Input
          type="search"
          name="q"
          placeholder="Company name or HE number..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1"
        />
        <Button type="submit">Search</Button>
      </form>

      <div className="mt-12">
        <h2 className="text-xl font-semibold">Browse by letter</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {letters.map((letter) => (
            <Link
              key={letter}
              to="/companies/a-z/$letter"
              params={{ letter: letter.toLowerCase() }}
              className="rounded-md bg-muted px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80"
            >
              {letter}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-semibold">Browse by district</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {data.districts.map((district) => (
            <Link
              key={district.name}
              to="/companies/city/$district"
              params={{ district: district.name }}
              className="flex items-center justify-between rounded-md border bg-card p-4 hover:bg-muted/50"
            >
              <span className="font-medium">{district.name}</span>
              <span className="text-sm text-muted-foreground">{district.count.toLocaleString()}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-12 text-sm text-muted-foreground">
        <p>
          Data sourced from the Cyprus Department of Registrar of Companies and Official Receiver. Information is
          provided for research and verification purposes.
        </p>
      </div>
    </div>
  );
}
