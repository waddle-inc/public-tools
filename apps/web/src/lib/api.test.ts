/**
 * `api.ts` のユニットテスト。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('verifySsoCode', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', 'http://api.test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('同一 code の同時呼び出しは fetch を 1 回だけ行う', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        accessToken: 'token-a',
        user: { id: 'u1', email: 'u@example.com', roles: ['customer'] },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { verifySsoCode } = await import('./api');

    const p1 = verifySsoCode('same-code');
    const p2 = verifySsoCode('same-code');
    const [a, b] = await Promise.all([p1, p2]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a.accessToken).toBe('token-a');
    expect(b.accessToken).toBe('token-a');
  });

  it('異なる code は別々に fetch する', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async (_url: string, init: RequestInit) => {
        const body = JSON.parse(init.body as string) as { code: string };
        return {
          ok: true,
          json: async () => ({
            accessToken: `token-${body.code}`,
            user: { id: 'u1', email: 'u@example.com', roles: [] },
          }),
        };
      });
    vi.stubGlobal('fetch', fetchMock);

    const { verifySsoCode } = await import('./api');

    const [x, y] = await Promise.all([
      verifySsoCode('code-a'),
      verifySsoCode('code-b'),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(x.accessToken).toBe('token-code-a');
    expect(y.accessToken).toBe('token-code-b');
  });
});

describe('fetchDownloadChunk', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', 'http://api.test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('200 のとき ArrayBuffer を返す', async () => {
    const buf = new ArrayBuffer(8);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => buf,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchDownloadChunk } = await import('./api');
    const out = await fetchDownloadChunk(
      'mytoken',
      10,
      new AbortController().signal,
    );

    expect(out).toBe(buf);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      'http://api.test/tools/download-speed/chunk?size_mb=10',
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'GET',
      headers: expect.objectContaining({
        Authorization: 'Bearer mytoken',
      }),
    });
  });

  it('401 のとき ApiError をスローする', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      }),
    );

    const { fetchDownloadChunk, ApiError } = await import('./api');

    await expect(
      fetchDownloadChunk('t', 5, new AbortController().signal),
    ).rejects.toSatisfy(
      (err: unknown) => err instanceof ApiError && err.status === 401,
    );
  });

  it('AbortSignal が既に abort なら AbortError をスローする', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { fetchDownloadChunk } = await import('./api');
    const ac = new AbortController();
    ac.abort();

    await expect(fetchDownloadChunk('tok', 1, ac.signal)).rejects.toMatchObject(
      { name: 'AbortError' },
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
