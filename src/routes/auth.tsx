import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { accountDestination } from "@/lib/account-destination";
import { Turnstile } from "@/components/turnstile";
import { getTurnstileSiteKey, verifyAuthChallenge } from "@/lib/auth-guard.functions";



export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { redirect?: string | undefined } => ({
    redirect: typeof search["redirect"] === "string" ? (search["redirect"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in | Companies House Cyprus" },
      { name: "description", content: "Sign in to your Companies House Cyprus account to track orders and download reports." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Sign in | Companies House Cyprus" },
      { property: "og:description", content: "Sign in to your Companies House Cyprus account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function safeRedirect(path: string | undefined): string | null {
  if (typeof path !== "string") return null;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (path.startsWith("/auth")) return null;
  return path;
}

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaNonce, setCaptchaNonce] = useState(0);
  const verifyChallenge = useServerFn(verifyAuthChallenge);

  const navigateForUser = async (userId: string, requestedRedirect?: string | undefined) => {
    const target = safeRedirect(requestedRedirect);

    if (target) {
      await navigate({ to: target, replace: true });
      return;
    }
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (error) throw error;
    await navigate({ to: accountDestination((data ?? []).map((row) => String(row.role))), replace: true });
  };

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active && data.user) void navigateForUser(data.user.id, redirect);
    });
    return () => {
      active = false;
    };
  }, [navigate, redirect]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await verifyChallenge({ data: { mode, token: captchaToken } });
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {

          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setResetSent(true);
        toast.success("Password reset email sent. Check your inbox.");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (error) throw error;
        toast.success("Account created. Check your email if confirmation is required, then sign in.");
        setMode("signin");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await navigateForUser(data.user.id, redirect);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setCaptchaNonce((n) => n + 1);
      setBusy(false);
    }
  };


  const heading = mode === "forgot" ? "Reset your password" : "Sign in";
  const intro =
    mode === "forgot"
      ? "Enter the email address on your account and we'll send you a link to choose a new password."
      : "Sign in to track your orders and download your certificates and reports.";

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{intro}</p>
      <form onSubmit={submit} className="mt-8 space-y-4 rounded-lg border bg-card p-6">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {mode !== "forgot" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password">Password</Label>
              {mode === "signin" && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                  onClick={() => {
                    setResetSent(false);
                    setMode("forgot");
                  }}
                >
                  Forgot your password?
                </button>
              )}
            </div>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}
        {mode === "forgot" && resetSent && (
          <p className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground">
            If an account exists for {email}, a reset link is on its way. The link expires after a
            short while — request another one if it stops working.
          </p>
        )}
        <Turnstile action={mode} onToken={setCaptchaToken} resetKey={captchaNonce} />
        <Button
          type="submit"
          className="w-full"
          disabled={busy || (Boolean(turnstileSiteKey) && !captchaToken)}
        >

          {busy
            ? "Please wait…"
            : mode === "forgot"
              ? resetSent
                ? "Resend reset link"
                : "Send reset link"
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
        </Button>
        <button
          type="button"
          className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => {
            setResetSent(false);
            setMode(mode === "signin" ? "signup" : "signin");
          }}
        >
          {mode === "signin" ? "Need an account? Create one" : "Back to sign in"}
        </button>
      </form>
    </div>
  );
}
