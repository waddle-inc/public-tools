import type { Page } from '@playwright/test';

const TOOL_WEB_ORIGIN = 'http://localhost:3001';

/**
 * ツール WEB のログイン画面へ遷移するまで待つ（クエリパラメータは任意）。
 */
export async function waitForToolWebLogin(page: Page): Promise<void> {
  await page.waitForURL(
    (url) => url.origin === TOOL_WEB_ORIGIN && url.pathname === '/login',
  );
}
