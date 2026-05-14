import { useContext } from 'react';
import { AuthContext } from './auth-shared';
import type { AuthContextValue } from './auth-types';

/**
 * `AuthProvider` が配布する認証状態を取得するフック。
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth は AuthProvider の内部で使用してください');
  }
  return ctx;
}
