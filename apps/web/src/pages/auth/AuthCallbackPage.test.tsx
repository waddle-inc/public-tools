/**
 * `AuthCallbackPage` のユニットテスト。
 */
import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AuthCallbackPage from './AuthCallbackPage';
import { AuthProvider } from '../../contexts/auth-context';
import type { ReactNode } from 'react';

vi.mock('../../lib/api', () => ({
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

vi.mock('../../lib/silent-refresh', () => ({
  silentRefresh: vi.fn(),
}));

import * as apiModule from '../../lib/api';
import * as silentRefreshModule from '../../lib/silent-refresh';

const mockVerifySsoCode = vi.mocked(apiModule.verifySsoCode);
const mockSilentRefresh = vi.mocked(silentRefreshModule.silentRefresh);

function renderWithRouter(url: string, children: ReactNode) {
  // MemoryRouter は window.location を同期しない。AuthProvider のコールバック判定と一致させる。
  const pathAndQuery = url.startsWith('/') ? url : `/${url}`;
  window.history.pushState({}, '', `http://localhost:3000${pathAndQuery}`);

  return render(
    <MemoryRouter initialEntries={[url]}>
      <AuthProvider>
        <Routes>
          <Route path="/auth/callback" element={<>{children}</>} />
          <Route path="/" element={<div>ダッシュボード</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSilentRefresh.mockRejectedValue(new Error('タイムアウト'));
    window.history.pushState({}, '', 'http://localhost:3000/');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.pushState({}, '', 'http://localhost:3000/');
  });

  it('code がある場合、POST /auth/sso/verify を呼び出して / へ遷移する', async () => {
    mockVerifySsoCode.mockResolvedValueOnce({
      accessToken: 'token',
      user: { id: 'u1', email: 'u@example.com', roles: ['customer'] },
    });

    renderWithRouter('/auth/callback?code=test-code', <AuthCallbackPage />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(mockVerifySsoCode).toHaveBeenCalledWith('test-code');
    expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
  });

  it('code がない場合、認証 WEB（フロントエンド）のログイン画面へリダイレクトする', async () => {
    const hrefSpy = vi.fn();
    let hrefValue = '';
    vi.stubGlobal('location', {
      origin: 'http://localhost',
      get href() {
        return hrefValue;
      },
      set href(v: string) {
        hrefValue = v;
        hrefSpy(v);
      },
    });

    renderWithRouter('/auth/callback', <AuthCallbackPage />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(hrefSpy).toHaveBeenCalledWith(expect.stringContaining('/login'));
  });
});
