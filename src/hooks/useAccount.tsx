import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AccountState = {
  ready: boolean;
  email: string | null;
  signedIn: boolean;
  isAdmin: boolean;
};

/**
 * Client-only session + role state. Never used during SSR render output
 * (consumers gate on `ready`) so it cannot cause hydration mismatches.
 */
export function useAccount(): AccountState {
  const [state, setState] = useState<AccountState>({
    ready: false,
    email: null,
    signedIn: false,
    isAdmin: false,
  });

  useEffect(() => {
    let active = true;

    const resolve = async (userId: string | null, email: string | null) => {
      if (!userId) {
        if (active) setState({ ready: true, email: null, signedIn: false, isAdmin: false });
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (active) {
        setState({ ready: true, email, signedIn: true, isAdmin: Boolean(data) });
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      void resolve(data.session?.user?.id ?? null, data.session?.user?.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      void resolve(session?.user?.id ?? null, session?.user?.email ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
