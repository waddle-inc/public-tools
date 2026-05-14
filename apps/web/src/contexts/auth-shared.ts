import { createContext } from 'react';
import type { AuthContextValue } from './auth-types';

/**
 * 認証状態をアプリ全体へ共有するための React Context。
 */
export const AuthContext = createContext<AuthContextValue | null>(null);
