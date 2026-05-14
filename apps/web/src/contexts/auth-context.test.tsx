/**
 * `AuthContext` のユニットテスト。
 */
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthProvider } from './auth-context';
import { useAuth } from './use-auth';
import type { ReactNode } from 'react';

vi.mock('../lib/api', () => ({
  verifySsoCode: vi.fn(),
  getMe: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number) {
      super(`API error: ${status}`);
      this.status = status;
    }
  },
}));

vi.mock('../lib/silent-refresh', () => ({
  silentRefresh: vi.fn(),
}));

import * as apiModule from '../lib/api';
import * as silentRefreshModule from '../lib/silent-refresh';

const mockVerifySsoCode = vi.mocked(apiModule.verifySsoCode);
const mockSilentRefresh = vi.mocked(silentRefreshModule.silentRefresh);

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, '', 'http://localhost:3000/');
  });

  it('/auth/callback ではサイレントリフレッシュを試行しない', async () => {
    window.history.pushState(
      {},
      '',
      'http://localhost:3000/auth/callback?code=x',
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(mockSilentRefresh).not.toHaveBeenCalled();
    expect(result.current.status).toBe('loading');
  });

  it('アクセストークンなしで起動した場合、サイレントリフレッシュを試行する', async () => {
    mockSilentRefresh.mockRejectedValueOnce(new Error('タイムアウト'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(mockSilentRefresh).toHaveBeenCalledOnce();
    expect(result.current.status).toBe('unauthenticated');
  });

  it('サイレントリフレッシュ成功時、POST /auth/sso/verify の結果をメモリに保存する', async () => {
    const accessToken = 'valid-access-token';
    const user = { id: 'u-sr', email: 'sr@example.com', roles: [] as string[] };
    mockSilentRefresh.mockResolvedValueOnce('valid-code');
    mockVerifySsoCode.mockResolvedValueOnce({ accessToken, user });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current.status).toBe('authenticated');
    expect(result.current.user?.email).toBe('sr@example.com');
    expect(result.current.accessToken).toBe(accessToken);
  });

  it('ログアウト時、認証 WEB の /logout?redirect=…（ツール WEB の /login）へ遷移する', async () => {
    mockSilentRefresh.mockRejectedValueOnce(new Error('セッションなし'));
    mockVerifySsoCode.mockResolvedValueOnce({
      accessToken: 'token',
      user: { id: 'u1', email: 'u@example.com', roles: [] },
    });

    let assignedHref = '';
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      window,
      'location',
    );

    try {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: {
          ...window.location,
          set href(url: string) {
            assignedHref = url;
          },
          get href() {
            return assignedHref || 'http://localhost:3000/';
          },
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      await act(async () => {
        await result.current.setAuthFromCode('code');
      });

      expect(result.current.status).toBe('authenticated');

      act(() => {
        result.current.logout();
      });

      expect(assignedHref).toContain('/logout');
      const logoutUrl = new URL(assignedHref, 'http://localhost:3000/');
      const redirectParam = logoutUrl.searchParams.get('redirect');
      expect(redirectParam).toBe('http://localhost:3000/login?logout=1');
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(window, 'location', originalDescriptor);
      }
    }
  });

  it('setAuthFromCode: 有効なコードで認証状態を確立する', async () => {
    mockSilentRefresh.mockRejectedValueOnce(new Error('セッションなし'));
    mockVerifySsoCode.mockResolvedValueOnce({
      accessToken: 'new-token',
      user: { id: 'u2', email: 'u2@example.com', roles: ['customer'] },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    await act(async () => {
      await result.current.setAuthFromCode('some-code');
    });

    expect(result.current.status).toBe('authenticated');
    expect(result.current.user?.email).toBe('u2@example.com');
  });

  it('refreshAccessToken でサイレントリフレッシュとコード検証が成功する', async () => {
    mockSilentRefresh.mockRejectedValueOnce(new Error('起動時は未ログイン'));
    mockSilentRefresh.mockResolvedValueOnce('sr-code');
    mockVerifySsoCode.mockResolvedValueOnce({
      accessToken: 'token',
      user: { id: 'u3', email: 'u3@example.com', roles: [] },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current.status).toBe('unauthenticated');

    await act(async () => {
      const token = await result.current.refreshAccessToken();
      expect(token).toBe('token');
    });

    expect(mockSilentRefresh).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('authenticated');
    expect(result.current.user?.email).toBe('u3@example.com');
  });
});
