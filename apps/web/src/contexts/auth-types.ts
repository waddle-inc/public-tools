import type { User } from '../lib/api';

/**
 * 認証状態。
 */
export type AuthStatus =
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'
  | 'error';

/**
 * `AuthContext` が配布する値。
 */
export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  error: string | null;
  accessToken: string | null;
  logout: () => void;
  setAuthFromCode: (code: string) => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
}
