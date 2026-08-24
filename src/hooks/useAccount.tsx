import { useAuthContext } from '@/lib/auth-context';

export type AccountState = {
  ready: boolean;
  email: string | null;
  signedIn: boolean;
  isAdmin: boolean;
};

/**
 * Client-only session + role state. Never used during SSR render output
 * (consumers gate on `ready`) so it cannot cause hydration mismatches.
 *
 * Backed by a shared AuthContext so sign-out updates every consumer immediately.
 */
export function useAccount(): AccountState {
  const { ready, email, signedIn, isAdmin } = useAuthContext();
  return { ready, email, signedIn, isAdmin };
}
