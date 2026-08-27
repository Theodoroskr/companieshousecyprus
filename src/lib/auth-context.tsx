import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AuthContextValue = {
  ready: boolean;
  email: string | null;
  signedIn: boolean;
  isAdmin: boolean;
  isSupport: boolean;
  /** Admin or support agent — may access the customer-facing admin areas. */
  isStaff: boolean;
  roles: string[];
  accountType: 'admin' | 'support' | 'client' | 'guest';
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<AuthContextValue, 'signOut'>>({
    ready: false,
    email: null,
    signedIn: false,
    isAdmin: false,
    isSupport: false,
    isStaff: false,
    roles: [],
    accountType: 'guest',
  });

  const resolve = useCallback(async (userId: string | null, email: string | null) => {
    if (!userId) {
      setState({
        ready: true,
        email: null,
        signedIn: false,
        isAdmin: false,
        isSupport: false,
        isStaff: false,
        roles: [],
        accountType: 'guest',
      });
      return;
    }
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId);
    const roles = (data ?? []).map((r) => String(r.role));
    const isAdmin = roles.includes('admin');
    const isSupport = roles.includes('support');
    setState({
      ready: true,
      email,
      signedIn: true,
      isAdmin,
      isSupport,
      isStaff: isAdmin || isSupport,
      roles,
      accountType: isAdmin ? 'admin' : isSupport ? 'support' : 'client',
    });
  }, []);

  const signOut = useCallback(async () => {
    // Optimistically clear auth state immediately so the header (and any other
    // consumer) re-renders in the logged-out state before the async sign-out
    // and navigation complete.
    setState((prev) => ({
      ...prev,
      signedIn: false,
      isAdmin: false,
      isSupport: false,
      isStaff: false,
      email: null,
      roles: [],
      accountType: 'guest',
    }));
    await supabase.auth.signOut();
  }, []);

  useEffect(() => {
    let active = true;

    const runResolve = async (userId: string | null, email: string | null) => {
      if (!active) return;
      await resolve(userId, email);
    };

    supabase.auth.getSession().then(({ data }) => {
      void runResolve(data.session?.user?.id ?? null, data.session?.user?.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT' && event !== 'USER_UPDATED') return;
      void runResolve(session?.user?.id ?? null, session?.user?.email ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [resolve]);

  return <AuthContext.Provider value={{ ...state, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
