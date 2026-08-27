import { useAuthContext } from '@/lib/auth-context';

export type AccountState = {
  ready: boolean;
  email: string | null;
  signedIn: boolean;
  isAdmin: boolean;
  isSupport: boolean;
  isStaff: boolean;
  roles: string[];
  accountType: 'admin' | 'support' | 'client' | 'guest';
};

/**
 * Client-only session + role state. Never used during SSR render output
 * (consumers gate on `ready`) so it cannot cause hydration mismatches.
 *
 * Backed by a shared AuthContext so sign-out updates every consumer immediately.
 */
export function useAccount(): AccountState {
  const { ready, email, signedIn, isAdmin, isSupport, isStaff, roles, accountType } = useAuthContext();
  return { ready, email, signedIn, isAdmin, isSupport, isStaff, roles, accountType };
}
