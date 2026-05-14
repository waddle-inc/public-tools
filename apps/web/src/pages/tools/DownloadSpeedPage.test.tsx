/**
 * `DownloadSpeedPage` のユニットテスト。
 */
import {
  render,
  screen,
  waitFor,
  act,
  fireEvent,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DownloadSpeedPage from './DownloadSpeedPage';
import { AuthContext } from '../../contexts/auth-shared';
import type { AuthContextValue } from '../../contexts/auth-types';
import type { User } from '../../lib/api';

vi.mock('../../lib/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../lib/api')>();
  return {
    ...mod,
    fetchDownloadChunk: vi.fn(),
  };
});

import * as api from '../../lib/api';

const mockFetchDownloadChunk = vi.mocked(api.fetchDownloadChunk);

const mockUser: User = {
  id: 'u1',
  email: 't@example.com',
  roles: ['customer'],
};

function renderPage() {
  const value: AuthContextValue = {
    status: 'authenticated',
    user: mockUser,
    error: null,
    accessToken: 'access-token-mock',
    logout: vi.fn(),
    setAuthFromCode: vi.fn(),
    refreshAccessToken: vi.fn().mockResolvedValue('access-token-mock'),
  };
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={value}>
        <DownloadSpeedPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('DownloadSpeedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.spyOn(performance, 'now').mockRestore();
    vi.useRealTimers();
  });

  it('計測開始後に Mbps が表示される', async () => {
    mockFetchDownloadChunk.mockResolvedValue(new ArrayBuffer(0));

    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: '計測開始' }));

    await waitFor(() => {
      expect(mockFetchDownloadChunk).toHaveBeenCalledWith(
        'access-token-mock',
        10,
        expect.any(AbortSignal),
      );
    });
    await waitFor(() => {
      expect(screen.getByText(/\d+\.\d{2} Mbps/)).toBeInTheDocument();
    });
    expect(screen.getByText(/計測サイズ: 10 MB/)).toBeInTheDocument();
    expect(screen.getByText(/所要時間:/)).toBeInTheDocument();
  });

  it('計測中止でメッセージを表示する', async () => {
    mockFetchDownloadChunk.mockImplementation((_token, _size, signal) => {
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: '計測開始' }));
    await user.click(await screen.findByRole('button', { name: '計測中止' }));

    await waitFor(() => {
      expect(screen.getByText('計測を中止しました')).toBeInTheDocument();
    });
  });

  it('30 秒でタイムアウトメッセージを表示する', async () => {
    vi.useFakeTimers();
    mockFetchDownloadChunk.mockImplementation((_token, _size, signal) => {
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    renderPage();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '計測開始' }));
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(
      screen.getByText('計測がタイムアウトしました（30秒）'),
    ).toBeInTheDocument();
  });
});
