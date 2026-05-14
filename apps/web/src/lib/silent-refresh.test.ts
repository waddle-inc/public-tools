/**
 * `silentRefresh` のユニットテスト。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('silentRefresh', () => {
  const authOrigin = 'https://auth.example.com';
  const callbackUrl = 'http://localhost:3001/auth/callback';

  beforeEach(() => {
    vi.stubEnv('VITE_AUTH_WEB_URL', authOrigin);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    document.body.replaceChildren();
  });

  it('同一 callbackUrl の同時呼び出しは iframe を 1 つだけ追加し、同じコードで解決する', async () => {
    const { silentRefresh } = await import('./silent-refresh');
    const appendSpy = vi.spyOn(document.body, 'appendChild');

    const p1 = silentRefresh(callbackUrl);
    const p2 = silentRefresh(callbackUrl);

    expect(appendSpy).toHaveBeenCalledTimes(1);

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: authOrigin,
        data: { type: 'auth-code', code: 'shared-code' },
      }),
    );

    await expect(Promise.all([p1, p2])).resolves.toEqual([
      'shared-code',
      'shared-code',
    ]);

    appendSpy.mockRestore();
  });

  it('異なる callbackUrl は前件完了後に別 iframe で実行できる', async () => {
    const { silentRefresh } = await import('./silent-refresh');
    const appendSpy = vi.spyOn(document.body, 'appendChild');

    const pA = silentRefresh(`${callbackUrl}?a=1`);
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: authOrigin,
        data: { type: 'auth-code', code: 'code-a' },
      }),
    );
    await expect(pA).resolves.toBe('code-a');

    const pB = silentRefresh(`${callbackUrl}?b=2`);
    expect(appendSpy).toHaveBeenCalledTimes(2);

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: authOrigin,
        data: { type: 'auth-code', code: 'code-b' },
      }),
    );
    await expect(pB).resolves.toBe('code-b');

    appendSpy.mockRestore();
  });

  it('auth-error を受信したら即座に reject する', async () => {
    vi.useFakeTimers();
    try {
      const { silentRefresh } = await import('./silent-refresh');
      const p = silentRefresh(callbackUrl);

      window.dispatchEvent(
        new MessageEvent('message', {
          origin: authOrigin,
          data: { type: 'auth-error', reason: 'unauthenticated' },
        }),
      );

      await expect(p).rejects.toThrow('サイレントリフレッシュが失敗しました');
      expect(document.querySelector('iframe')).toBeNull();

      await vi.advanceTimersByTimeAsync(30000);
    } finally {
      vi.useRealTimers();
    }
  });

  it('auth-error（exchange-failed）を受信したら即座に reject する', async () => {
    vi.useFakeTimers();
    try {
      const { silentRefresh } = await import('./silent-refresh');
      const p = silentRefresh(callbackUrl);

      window.dispatchEvent(
        new MessageEvent('message', {
          origin: authOrigin,
          data: { type: 'auth-error', reason: 'exchange-failed' },
        }),
      );

      await expect(p).rejects.toThrow('サイレントリフレッシュが失敗しました');
      expect(document.querySelector('iframe')).toBeNull();

      await vi.advanceTimersByTimeAsync(30000);
    } finally {
      vi.useRealTimers();
    }
  });
});
