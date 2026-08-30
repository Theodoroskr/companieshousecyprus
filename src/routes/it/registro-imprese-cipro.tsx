import { createFileRoute, notFound } from "@tanstack/react-router";
import { InternationalGuidePage } from "@/components/international/guide-page";
import { buildGuideHead, getGuideByPath } from "@/lib/seo/international-guides";

const PATH = "/it/registro-imprese-cipro";

export const Route = createFileRoute("/it/registro-imprese-cipro")({
  loader: () => {
    const guide = getGuideByPath(PATH);
    if (!guide) throw notFound();
    return null;
  },
  head: () => {
    const guide = getGuideByPath(PATH);
    if (!guide) return { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] };
    return buildGuideHead(guide);
  },
  component: GuideRoute,
});

function GuideRoute() {
  const guide = getGuideByPath(PATH);
  if (!guide) return null;
  return <InternationalGuidePage guide={guide} />;
}
