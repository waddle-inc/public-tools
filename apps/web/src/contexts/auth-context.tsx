import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError, getMe, verifySsoCode } from '../lib/api';
import type { User } from '../lib/api';
import { silentRefresh } from '../lib/silent-refresh';
import { AuthContext } from './auth-shared';
import type { AuthContextValue, AuthStatus } from './auth-types';

const AUTH_WEB_URL = import.meta.env.VITE_AUTH_WEB_URL ?? '';

/**
 * `AuthContext` を通じて、SSO 認証フロー（サイレントリフレッシュ/コード検証）と
 * ログイン状態（ユーザー情報・アクセストークン）を管理するプロバイダ。
 */

/**
 * 認証コールバックの URL を作成する。
 */
function getCallbackUrl(): string {
  return `${window.location.origin}/auth/callback`;
}

/**
 * 認証 WEB のログアウト URL を返す。
 * ログアウト完了後にツール WEB の `/login` へ戻るため、`redirect` にその完全 URL を付与する。
 */
function getLogoutUrl(): string {
  const loginPageUrl = `${window.location.origin}/login?logout=1`;
  const redirect = encodeURIComponent(loginPageUrl);
  return `${AUTH_WEB_URL}/logout?redirect=${redirect}`;
}

/**
 * SSO コールバックルートでは `AuthCallbackPage` が URL の code を検証する。
 * ここでサイレントリフレッシュと並走させると認可コードの二重検証や状態の上書きが起きるため、初期化のサイレントリフレッシュは行わない。
 */
function shouldDeferAuthToCallbackPage(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.location.pathname === '/auth/callback'
  );
}

/**
 * `AuthProvider` の props。
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * 認証状態を初期化し、`AuthContext` の値を配布する。
 */
export function AuthProvider({ children }: AuthProviderProps) {
  // 認証状態を管理する状態（loading、authenticated、unauthenticated、error）
  const [status, setStatus] = useState<AuthStatus>('loading');
  // ユーザー情報を管理する状態（User | null）
  const [user, setUser] = useState<User | null>(null);
  // エラーを管理する状態（string | null）
  const [error, setError] = useState<string | null>(null);
  // アクセストークンを管理する状態（string | null）
  const [accessToken, setAccessToken] = useState<string | null>(null);

  /**
   * サイレントリフレッシュの結果から、アクセストークンとユーザー情報を復元する。
   * 失敗した場合は未認証状態に戻す。
   *
   * @returns 新しいアクセストークン。失敗時は `null`。
   */
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const code = await silentRefresh(getCallbackUrl());
      const result = await verifySsoCode(code);
      setAccessToken(result.accessToken);
      setUser(result.user);
      setStatus('authenticated');
      return result.accessToken;
    } catch {
      setAccessToken(null);
      setUser(null);
      setStatus('unauthenticated');
      return null;
    }
  }, []);

  /**
   * SSO コード検証の結果から、アクセストークンとユーザー情報を状態に反映する。
   *
   * @param code SSO 認証が発行した一時コード。
   * @returns なし（内部で状態のみ更新）。
   */
  const setAuthFromCode = useCallback(async (code: string): Promise<void> => {
    try {
      const result = await verifySsoCode(code);
      setAccessToken(result.accessToken);
      setUser(result.user);
      setStatus('authenticated');
    } catch (err) {
      setAccessToken(null);
      setUser(null);
      setStatus('unauthenticated');
      if (
        err instanceof ApiError &&
        (err.status === 400 || err.status === 500)
      ) {
        setError('認証に失敗しました。再度ログインしてください。');
      }
      throw err;
    }
  }, []);

  /**
   * 認証 WEB（フロントエンド）の `/logout?redirect=…` へリダイレクトし、auth セッションも切る。
   * `redirect` にはツール WEB の `/login` の完全 URL を渡し、ログアウト後に同画面へ戻す。
   * 全画面遷移ではページアンロードによりメモリ上の認証状態は破棄されるため、事前の状態クリアは行わない。
   *
   * @returns なし（内部でページ遷移）。
   */
  const logout = useCallback(() => {
    // setStatus('unauthenticated') を先に呼ぶと DashboardPage の未認証ガード（useEffect）が
    // window.location.href を '/login' へ上書きしてしまう。全画面遷移時は React の
    // メモリ上の状態はページアンロードで自動破棄されるため、状態更新は不要。
    window.location.href = getLogoutUrl();
  }, []);

  useEffect(() => {
    // コンポーネントがマウントされている間のみ状態を更新するためのガード
    let isMounted = true;

    /**
     * 初期化処理:
     * - 1. 既に保持しているアクセストークンで認証状態を確立する（`getMe`）
     * - 2. トークンがない、または 1. が失敗した場合はサイレントリフレッシュで認証状態を復元する
     */
    async function initialize() {
      // アクセストークンで認証状態を確立する
      if (accessToken) {
        try {
          const result = await getMe(accessToken, refreshAccessToken);
          if (isMounted) {
            setUser(result.user);
            setStatus('authenticated');
          }
          return;
        } catch {
          // トークンが無効・期限切れ等の場合は、サイレントリフレッシュへフォールバックする
        }
      }

      if (shouldDeferAuthToCallbackPage()) {
        return;
      }

      if (isMounted) {
        try {
          const code = await silentRefresh(getCallbackUrl());
          if (isMounted) {
            const result = await verifySsoCode(code);
            if (isMounted) {
              setAccessToken(result.accessToken);
              setUser(result.user);
              setStatus('authenticated');
            }
          }
        } catch {
          if (isMounted) {
            setAccessToken(null);
            setUser(null);
            setStatus('unauthenticated');
          }
        }
      }
    }

    void initialize();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AuthContextValue = {
    status,
    user,
    error,
    accessToken,
    logout,
    setAuthFromCode,
    refreshAccessToken,
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}
