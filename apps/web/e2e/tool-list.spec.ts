/**
 * ツール一覧画面の E2E テスト。
 *
 * 主要ケース:
 * - SSO コールバック後にツール一覧（登録済みツール）が表示される
 * - 未認証ユーザーが / にアクセスするとツール WEB の /login へ遷移する
 * - ログアウトボタン押下で認証 WEB の /logout?redirect=… へ遷移し、/login へ戻る
 */
import { test, expect } from '@playwright/test';
import { mockAuthLogout, mockVerifySsoSuccess } from './helpers/auth-mocks';
import { waitForToolWebLogin } from './helpers/navigation';

test.describe('ツール一覧', () => {
  test('SSO コールバック後にブラウザ情報ツールが表示される', async ({
    page,
  }) => {
    await mockVerifySsoSuccess(page);

    await page.goto('/auth/callback?code=test-code');

    await expect(
      page.getByRole('heading', { name: 'ツール一覧' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'ブラウザ情報' }),
    ).toBeVisible();
  });

  test('未認証ユーザーが / にアクセスするとツール WEB の /login へ遷移する', async ({
    page,
  }) => {
    await page.goto('/');

    await waitForToolWebLogin(page);
    expect(page.url()).toContain('/login');
  });

  test('SSO コールバック後に / を開くとツール一覧が表示される', async ({
    page,
  }) => {
    await mockVerifySsoSuccess(page);

    await page.goto('/auth/callback?code=test-code');

    await expect(
      page.getByRole('heading', { name: 'ツール一覧' }),
    ).toBeVisible();
  });

  test('ログアウトボタン押下で認証 WEB のログアウトへ遷移し /login へ戻る', async ({
    page,
  }) => {
    await mockVerifySsoSuccess(page);
    await mockAuthLogout(page);

    await page.goto('/auth/callback?code=test-code');

    await expect(
      page.getByRole('button', { name: 'ログアウト' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'ログアウト' }).click();

    await waitForToolWebLogin(page);
    expect(page.url()).toContain('/login');
  });
});
