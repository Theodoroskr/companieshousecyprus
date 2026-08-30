import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { normalizeCompanySlug } from "@/lib/slug";

export type SuppressionStatus = "active" | "lifted";

export type Suppression = Database["public"]["Tables"]["officials_suppressions"]["Row"];

function adminClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Missing Supabase service credentials");
  const isNewKey = key.startsWith("sb_secret_") || key.startsWith("sb_publishable_");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(
          typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
        );
        if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
        if (isNewKey && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export async function listSuppressions(input: { search?: string; status?: SuppressionStatus | "all" }) {
  const supabase = adminClient();
  let query = supabase
    .from("officials_suppressions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (input.status && input.status !== "all") query = query.eq("status", input.status);

  const search = (input.search ?? "").trim();
  if (search) {
    const like = `%${search.replace(/[%_]/g, "")}%`;
    query = query.or(
      `person_name.ilike.${like},company_slug.ilike.${like},requester_email.ilike.${like}`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Re-queue every company page that showed this name so search engines pick up
 * the withheld version instead of a cached copy.
 */
async function requeueAffectedCompanies(personName: string, companySlug: string | null) {
  const supabase = adminClient();
  let query = supabase.from("officials").select("slug").eq("person_name", personName).limit(500);
  if (companySlug) query = query.eq("slug", companySlug);
  const { data } = await query;
  const slugs = Array.from(new Set((data ?? []).map((r) => r.slug)));
  if (slugs.length === 0) return 0;
  // Queue the canonical, name-based paths — those are the URLs search engines index.
  const { data: companies } = await supabase
    .from("companies")
    .select("slug, canonical_slug")
    .in("slug", slugs);
  const canonicalBySlug = new Map((companies ?? []).map((c) => [c.slug, c.canonical_slug ?? c.slug]));
  const { data: queued } = await supabase.rpc("enqueue_indexnow_urls", {
    _paths: slugs.map((s) => `/company/${canonicalBySlug.get(s) ?? s}`),
  });
  return typeof queued === "number" ? queued : slugs.length;
}

export async function createSuppression(input: {
  personName: string;
  companySlug?: string | null;
  requesterEmail?: string | null;
  reason?: string | null;
  internalNotes?: string | null;
  userId: string;
}) {
  const personName = input.personName.trim();
  if (!personName) throw new Error("A person name is required");

  const companySlug = input.companySlug?.trim() ? normalizeCompanySlug(input.companySlug) : null;

  const supabase = adminClient();
  const { data, error } = await supabase
    .from("officials_suppressions")
    .insert({
      person_name: personName,
      // Overwritten by the database trigger; required by the NOT NULL column.
      person_name_normalized: personName.toUpperCase(),
      company_slug: companySlug,
      requester_email: input.requesterEmail?.trim() || null,
      reason: input.reason?.trim() || null,
      internal_notes: input.internalNotes?.trim() || null,
      status: "active",
      created_by: input.userId,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("A suppression already exists for that name and scope");
    throw new Error(error.message);
  }

  const requeued = await requeueAffectedCompanies(personName, companySlug);
  return { suppression: data, requeued };
}

export async function setSuppressionStatus(id: string, status: SuppressionStatus) {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("officials_suppressions")
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const requeued = await requeueAffectedCompanies(data.person_name, data.company_slug);
  return { suppression: data, requeued };
}

export async function deleteSuppression(id: string) {
  const supabase = adminClient();
  const { data: existing } = await supabase
    .from("officials_suppressions")
    .select("person_name, company_slug")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from("officials_suppressions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (existing) await requeueAffectedCompanies(existing.person_name, existing.company_slug);
  return { ok: true };
}

/** Officer names on a company, to help an admin pick the exact stored spelling. */
export async function lookupCompanyOfficials(slugInput: string) {
  const slug = normalizeCompanySlug(slugInput);
  if (!slug) return { slug: "", companyName: null as string | null, officials: [] as string[] };
  const supabase = adminClient();
  const [{ data: company }, { data: officials }] = await Promise.all([
    supabase.from("companies").select("slug, name").eq("slug", slug).maybeSingle(),
    supabase.from("officials").select("person_name").eq("slug", slug).limit(50),
  ]);
  return {
    slug,
    companyName: company?.name ?? null,
    officials: Array.from(new Set((officials ?? []).map((o) => o.person_name))),
  };
}
