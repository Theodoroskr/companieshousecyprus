import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { authChallengeResponse, decideAuthGuard } from "./lib/auth-edge-guard";
import { inspectRequest, wafDenyResponse } from "./lib/waf";

// Application WAF: 403s known login-probe paths (/wp-admin, .env, ...),
// scanner user agents, and per-IP bursts on real auth surfaces.
const wafMiddleware = createMiddleware().server(async ({ next, request }) => {
  const verdict = inspectRequest(request);
  if (verdict.action === "deny") {
    return wafDenyResponse(verdict.reason);
  }
  return next();
});

// Blocks the cookieless data-centre botnet that hammers /auth: those clients
// never run JS, so they loop on the interstitial instead of hitting the app.
const authBotGuard = createMiddleware().server(async ({ next, request }) => {
  if (decideAuthGuard(request) === "challenge") {
    return authChallengeResponse(request.url);
  }
  return next();
});


const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  if (new URL(request.url).pathname.startsWith("/lovable/")) {
    return next();
  }

  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) =>
    ctx.handlerType === "serverFn" && !new URL(ctx.request.url).pathname.startsWith("/lovable/"),
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [wafMiddleware, authBotGuard, errorMiddleware, csrfMiddleware],
}));

