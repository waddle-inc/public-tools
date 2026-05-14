/**
 * E2E テスト用の認証関連ネットワークモックヘルパー。
 *
 * `.env` で定義されている URL に合わせて `page.route()` でインターセプトする。
 */
import type { Page } from '@playwright/test';

export const API_URL = 'http://localhost:8001';
export const AUTH_WEB_URL = 'http://localhost:3000';

export interface MockUser {
  id: string;
  email: string;
  roles: string[];
}

export const DEFAULT_USER: MockUser = {
  id: 'user-1',
  email: 'test@example.com',
  roles: ['customer'],
};

/**
 * サイレントリフレッシュを成功させるモック。
 * iframe が postMessage でコードを送信するページを返す。
 */
export async function mockSilentRefreshSuccess(
  page: Page,
  code = 'silent-code',
): Promise<void> {
  await page.route(`${AUTH_WEB_URL}/silent-refresh**`, (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: `<html><body><script>window.parent.postMessage({ type: 'auth-code', code: ${JSON.stringify(code)} }, '*')</script></body></html>`,
    });
  });
}

/**
 * サイレントリフレッシュをタイムアウトさせるモック。
 * postMessage を送信しない空のページを返す。
 */
export async function mockSilentRefreshTimeout(page: Page): Promise<void> {
  await page.route(`${AUTH_WEB_URL}/silent-refresh**`, (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body></body></html>',
    });
  });
}

/**
 * POST /auth/sso/verify を成功でモックする。
 */
export async function mockVerifySsoSuccess(
  page: Page,
  user: MockUser = DEFAULT_USER,
  accessToken = 'test-token',
): Promise<void> {
  await page.route(`${API_URL}/auth/sso/verify`, (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ accessToken, user }),
    });
  });
}

/**
 * POST /auth/sso/verify を 401 でモックする。
 */
export async function mockVerifySsoUnauthorized(page: Page): Promise<void> {
  await page.route(`${API_URL}/auth/sso/verify`, (route) => {
    void route.fulfill({ status: 401 });
  });
}

/**
 * POST /auth/sso/verify を 400 でモックする。
 */
export async function mockVerifySsoBadRequest(page: Page): Promise<void> {
  await page.route(`${API_URL}/auth/sso/verify`, (route) => {
    void route.fulfill({ status: 400 });
  });
}

/**
 * 認証 WEB（フロントエンド）のログアウト画面をモックする。
 *
 * `redirect` が付いていればその URL へ 302 し、E2E で認証サーバを立てずにツール WEB の `/login` まで誘導できる。
 */
export async function mockAuthLogout(page: Page): Promise<void> {
  await page.route(`${AUTH_WEB_URL}/logout**`, (route) => {
    const url = new URL(route.request().url());
    const redirect =
      url.searchParams.get('redirect') ?? 'http://localhost:3001/login';
    void route.fulfill({
      status: 302,
      headers: { Location: redirect },
    });
  });
}

/**
 * 認証 WEB（フロントエンド）のログイン画面をモックする。
 */
export async function mockLoginPage(page: Page): Promise<void> {
  await page.route(`${AUTH_WEB_URL}/login**`, (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body><p>ログイン画面</p></body></html>',
    });
  });
}
