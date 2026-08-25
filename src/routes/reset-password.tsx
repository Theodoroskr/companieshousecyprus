import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password | Companies House Cyprus" },
      {
        name: "description",
        content: "Choose a new password for your Companies House Cyprus account.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Set a new password | Companies House Cyprus" },
      { property: "og:description", content: "Choose a new password for your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // The recovery link puts a session in place (either via the hash tokens or
    // the PKCE code exchange the client performs automatically).
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setHasSession(true);
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("The two passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You are now signed in.");
      await navigate({ to: "/account/orders", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Set a new password</h1>
      {!ready ? (
        <p className="mt-2 text-sm text-muted-foreground">Checking your reset link…</p>
      ) : hasSession ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a new password for your account. It must be at least 8 characters.
          </p>
          <form onSubmit={submit} className="mt-8 space-y-4 rounded-lg border bg-card p-6">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Saving…" : "Update password"}
            </Button>
          </form>
        </>
      ) : (
        <div className="mt-8 space-y-4 rounded-lg border bg-card p-6 text-sm">
          <p className="text-muted-foreground">
            This password reset link is invalid or has expired. Request a new one and open the most
            recent email we sent you.
          </p>
          <Button asChild variant="outline">
            <Link to="/auth">Back to sign in</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
