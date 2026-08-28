import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Verifies a bearer token against the private per-job secret stored in
 * `job_state.secret`. These secrets are server-side only (service role reads)
 * and are never shipped to the browser, unlike the publishable key.
 */
export async function verifyJobSecretFor(key: string, token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  const { data } = await supabaseAdmin
    .from("job_state")
    .select("secret")
    .eq("key", key)
    .maybeSingle();
  const secret = (data as { secret?: string | null } | null)?.secret;
  return !!secret && secret.length === token.length && secret === token;
}

export function bearerToken(request: Request): string | null {
  return /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "")?.[1] ?? null;
}

/** Returns an error Response when the caller is not an authorized scheduler. */
export async function authorizeScheduler(request: Request, jobKey: string): Promise<Response | null> {
  if (await verifyJobSecretFor(jobKey, bearerToken(request))) return null;
  const { authenticateCronRequest } = await import("@/integrations/supabase/cron-auth");
  const failure = await authenticateCronRequest(request);
  if (failure) return new Response("Unauthorized", { status: 401 });
  return null;
}
