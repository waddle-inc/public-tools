/**
 * サイレントリフレッシュ（外部認証のコード発行）を実行する。
 *
 * 内部的には隠し iframe を利用し、`AUTH_WEB_URL` から `postMessage` で
 * `{ type: 'auth-code', code }` を受け取って解決する。
 *
 * 同一 `callbackUrl` への同時呼び出しは 1 回の iframe / 認証フローにまとめる。
 * （React Strict Mode の二重マウントや並列初期化で `POST /auth/refresh` が競合し、
 * リフレッシュトークンのローテーションと再利用検知が衝突するのを防ぐ。）
 */
const AUTH_WEB_URL = import.meta.env.VITE_AUTH_WEB_URL ?? '';
const AUTH_WEB_ORIGIN = AUTH_WEB_URL ? new URL(AUTH_WEB_URL).origin : '';
const SILENT_REFRESH_TIMEOUT_MS = 10000;

/** `callbackUrl` ごとに進行中の処理を共有する。 */
const inFlightByCallbackUrl = new Map<string, Promise<string>>();

/**
 * 認証WEB（フロントエンド）で発行された一時コードを取得する。
 *
 * 内部的には隠し iframe を利用し、`AUTH_WEB_URL` から `postMessage` で
 * `{ type: 'auth-code', code }` を受け取って解決する。
 *
 * @param callbackUrl - 認証完了後に呼び出されるコールバック URL
 * @returns 認証コード
 */
export function silentRefresh(callbackUrl: string): Promise<string> {
  const existing = inFlightByCallbackUrl.get(callbackUrl);
  if (existing) {
    return existing;
  }

  const promise = runSilentRefresh(callbackUrl).finally(() => {
    inFlightByCallbackUrl.delete(callbackUrl);
  });
  inFlightByCallbackUrl.set(callbackUrl, promise);
  return promise;
}

/**
 * 隠し iframe でサイレントリフレッシュ URL を開き、postMessage でコードを受け取る。
 */
function runSilentRefresh(callbackUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';

    let timer: ReturnType<typeof setTimeout> | null = null;

    /**
     * タイムアウトやエラー時のクリーンアップを行う。
     */
    function cleanup() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      window.removeEventListener('message', onMessage);
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }

    /**
     * `postMessage` で `{ type: 'auth-code', code }` を受け取った時のハンドラ。
     *
     * @param event - MessageEvent オブジェクト
     */
    function onMessage(event: MessageEvent) {
      if (event.origin !== AUTH_WEB_ORIGIN) {
        return;
      }
      const data = event.data as {
        type?: string;
        code?: string;
        reason?: string;
      };
      if (data?.type === 'auth-code' && typeof data.code === 'string') {
        cleanup();
        resolve(data.code);
      } else if (data?.type === 'auth-error') {
        cleanup();
        reject(new Error('サイレントリフレッシュが失敗しました'));
      }
    }

    window.addEventListener('message', onMessage);

    /**
     * タイムアウト時のクリーンアップを行う。
     */
    timer = setTimeout(() => {
      cleanup();
      reject(new Error('サイレントリフレッシュがタイムアウトしました'));
    }, SILENT_REFRESH_TIMEOUT_MS);

    const silentRefreshUrl = `${AUTH_WEB_URL}/silent-refresh?redirect=${encodeURIComponent(callbackUrl)}`;
    iframe.src = silentRefreshUrl;
    document.body.appendChild(iframe);
  });
}
