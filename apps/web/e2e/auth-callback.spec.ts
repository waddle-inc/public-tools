/**
 * SSO コールバック画面の E2E テスト。
 *
 * 主要ケース:
 * - /auth/callback?code=... で検証成功時、ツール一覧へ遷移する
 * - /auth/callback に code がない場合、ツール WEB の /login へ遷移する
 * - POST /auth/sso/verify が 401 の場合、ツール WEB の /login へ遷移する
 */
import { test, expect } from '@playwright/test';
import {
  mockVerifySsoSuccess,
  mockVerifySsoUnauthorized,
} from './helpers/auth-mocks';
import { waitForToolWebLogin } from './helpers/navigation';

test.describe('SSO コールバック', () => {
  test('/auth/callback?code=... で検証成功時、ツール一覧へ遷移する', async ({
    page,
  }) => {
    await mockVerifySsoSuccess(page);

    await page.goto('/auth/callback?code=test-code');

    await page.waitForURL('/');
    await expect(
      page.getByRole('heading', { name: 'ツール一覧' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'ブラウザ情報' }),
    ).toBeVisible();
  });

  test('/auth/callback に code がない場合、ツール WEB の /login へ遷移する', async ({
    page,
  }) => {
    await page.goto('/auth/callback');

    await waitForToolWebLogin(page);
    expect(page.url()).toContain('/login');
  });

  test('POST /auth/sso/verify が 401 の場合、ツール WEB の /login へ遷移する', async ({
    page,
  }) => {
    await mockVerifySsoUnauthorized(page);

    await page.goto('/auth/callback?code=bad-code');

    await waitForToolWebLogin(page);
    expect(page.url()).toContain('/login');
  });
});
