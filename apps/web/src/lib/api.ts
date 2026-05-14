/**
 * ツールサービス WEB（フロントエンド）からツールサービス API（バックエンド）へアクセスするためのクライアント。
 *
 * `me` 取得や SSO コード検証を提供し、401 の場合はコールバックでトークン更新を試みる。
 */
import type { components } from './api.types';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

/** ツールサービス API（バックエンド）で扱うユーザー情報。 */
export type User = components['schemas']['AuthenticatedUser'];

/** `POST /auth/sso/verify` のレスポンス。 */
export type SsoVerifyResponse = components['schemas']['SsoVerifyResponse'];

/** `GET /auth/me` のレスポンス。 */
export type MeResponse = components['schemas']['MeResponse'];

/** `GET /tools/browser-info` のレスポンス。 */
export type BrowserInfoResponse = components['schemas']['BrowserInfoResponse'];

/** `POST /tools/summarize` のリクエストボディ。 */
export type SummarizeRequest = components['schemas']['SummarizeRequest'];

/** `POST /tools/summarize` のレスポンス。 */
export type SummarizeResponse = components['schemas']['SummarizeResponse'];

type OnUnauthorized = () => Promise<string | null>;

/** 同一認可コードへの並列検証を 1 リクエストにまとめる（使い捨てコードの二重消費を防ぐ）。 */
const verifySsoInFlight = new Map<string, Promise<SsoVerifyResponse>>();

/**
 * 認証付きで API を呼び出すための共通関数。
 *
 * - `accessToken` がある場合、`Authorization: Bearer ...` を付与する
 * - 401 かつリトライ未実施の場合、`onUnauthorized()` を呼んで新しいトークンを取得し、
 *   取得できたら同じリクエストを 1 回だけ再実行する
 *
 * @param path - API のパス
 * @param options - RequestInit オブジェクト
 * @param accessToken - アクセストークン
 * @param onUnauthorized - 401 エラー時のコールバック
 * @param isRetry - リトライフラグ
 * @returns Response オブジェクト
 */
async function fetchWithAuth(
  path: string,
  options: RequestInit,
  accessToken: string | null,
  onUnauthorized: OnUnauthorized,
  isRetry = false,
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(options.body != null ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string>),
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !isRetry) {
    const newToken = await onUnauthorized();
    if (newToken) {
      return fetchWithAuth(path, options, newToken, onUnauthorized, true);
    }
  }

  return response;
}

/**
 * 現在ログイン中のユーザー情報を取得する。
 *
 * アクセストークンが無効（401）なら、`onUnauthorized` で新しいトークンを取得できる場合に限りリトライする。
 *
 * @param accessToken - アクセストークン
 * @param onUnauthorized - 401 エラー時のコールバック
 * @returns MeResponse オブジェクト
 */
export async function getMe(
  accessToken: string,
  onUnauthorized: OnUnauthorized,
): Promise<MeResponse> {
  const response = await fetchWithAuth(
    '/auth/me',
    { method: 'GET' },
    accessToken,
    onUnauthorized,
  );
  if (!response.ok) {
    throw new ApiError(response.status);
  }
  return response.json() as Promise<MeResponse>;
}

/**
 * サーバーから見たクライアント IP を取得する。
 *
 * @param accessToken - アクセストークン
 * @param onUnauthorized - 401 エラー時のコールバック
 * @returns BrowserInfoResponse オブジェクト
 */
export async function getBrowserInfo(
  accessToken: string,
  onUnauthorized: OnUnauthorized,
): Promise<BrowserInfoResponse> {
  const response = await fetchWithAuth(
    '/tools/browser-info',
    { method: 'GET' },
    accessToken,
    onUnauthorized,
  );
  if (!response.ok) {
    throw new ApiError(response.status);
  }
  return response.json() as Promise<BrowserInfoResponse>;
}

/**
 * 入力テキストを Gemini で要約する。
 *
 * @param accessToken - アクセストークン
 * @param onUnauthorized - 401 エラー時のコールバック
 * @param body - 要約対象テキストと長さ指定
 * @returns SummarizeResponse オブジェクト
 */
export async function fetchSummarize(
  accessToken: string,
  onUnauthorized: OnUnauthorized,
  body: SummarizeRequest,
): Promise<SummarizeResponse> {
  const response = await fetchWithAuth(
    '/tools/summarize',
    { method: 'POST', body: JSON.stringify(body) },
    accessToken,
    onUnauthorized,
  );
  if (!response.ok) {
    throw new ApiError(response.status);
  }
  return response.json() as Promise<SummarizeResponse>;
}

/**
 * ダウンロード速度計測用に、指定サイズのバイナリチャンクを取得する。
 *
 * @param accessToken - アクセストークン
 * @param sizeMb - 取得するデータサイズ（MB）
 * @param signal - 計測中止やタイムアウト用の `AbortSignal`
 * @returns レスポンス本文の `ArrayBuffer`
 */
export async function fetchDownloadChunk(
  accessToken: string,
  sizeMb: number,
  signal: AbortSignal,
): Promise<ArrayBuffer> {
  if (signal.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
  const path = `/tools/download-speed/chunk?size_mb=${encodeURIComponent(String(sizeMb))}`;
  const response = await fetchWithAuth(
    path,
    { method: 'GET', signal },
    accessToken,
    async () => null,
  );
  if (!response.ok) {
    throw new ApiError(response.status);
  }
  return response.arrayBuffer();
}

/**
 * 認証API（バックエンド）が発行したコードを検証し、アクセストークンとユーザー情報を返す。
 *
 * ツールサービス API の `POST /auth/sso/verify` を呼び出します。
 *
 * @param code - SSO 認可コード
 * @returns SsoVerifyResponse オブジェクト
 */
export async function verifySsoCode(code: string): Promise<SsoVerifyResponse> {
  const existing = verifySsoInFlight.get(code);
  if (existing) {
    return existing;
  }

  const promise = runVerifySsoCode(code).finally(() => {
    verifySsoInFlight.delete(code);
  });
  verifySsoInFlight.set(code, promise);
  return promise;
}

async function runVerifySsoCode(code: string): Promise<SsoVerifyResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/sso/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) {
    throw new ApiError(response.status);
  }
  return response.json() as Promise<SsoVerifyResponse>;
}

/**
 * API のレスポンスステータスを保持するエラー。
 */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`API error: ${status}`);
    this.status = status;
  }
}
