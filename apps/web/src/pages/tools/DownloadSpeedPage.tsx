import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout';
import { ApiError, fetchDownloadChunk } from '../../lib/api';
import { useAuth } from '../../contexts/use-auth';
import styles from './DownloadSpeedPage.module.css';

type MeasureStatus = 'idle' | 'measuring' | 'done' | 'error';

const TIMEOUT_MS = 30_000;

function isAbortError(e: unknown): boolean {
  return (
    (typeof DOMException !== 'undefined' &&
      e instanceof DOMException &&
      e.name === 'AbortError') ||
    (e instanceof Error && e.name === 'AbortError')
  );
}

/**
 * サーバーからのバイナリ取得に要した時間から下り速度を推定して表示するページ。
 */
export default function DownloadSpeedPage() {
  const { accessToken } = useAuth();
  const [status, setStatus] = useState<MeasureStatus>('idle');
  const [selectedSizeMb, setSelectedSizeMb] = useState(10);
  const [resultMbps, setResultMbps] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledByUserRef = useRef(false);

  const clearMeasureTimeout = useCallback(() => {
    if (timeoutIdRef.current != null) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  }, []);

  const releaseAbortController = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      clearMeasureTimeout();
      releaseAbortController();
    };
  }, [clearMeasureTimeout, releaseAbortController]);

  const startMeasure = useCallback(async () => {
    clearMeasureTimeout();
    releaseAbortController();

    cancelledByUserRef.current = false;
    setErrorMessage(null);
    setResultMbps(null);
    setElapsedMs(null);

    const controller = new AbortController();
    abortRef.current = controller;

    timeoutIdRef.current = setTimeout(() => {
      timeoutIdRef.current = null;
      controller.abort();
    }, TIMEOUT_MS);

    setStatus('measuring');

    const start = performance.now();
    try {
      await fetchDownloadChunk(
        accessToken ?? '',
        selectedSizeMb,
        controller.signal,
      );
      const elapsed = Math.max(performance.now() - start, 1e-9);
      const mbps =
        (selectedSizeMb * 1024 * 1024 * 8) / (elapsed / 1000) / 1_000_000;

      clearMeasureTimeout();
      releaseAbortController();

      setElapsedMs(elapsed);
      setResultMbps(mbps);
      setStatus('done');
    } catch (e) {
      clearMeasureTimeout();
      releaseAbortController();

      if (isAbortError(e)) {
        setStatus('error');
        setErrorMessage(
          cancelledByUserRef.current
            ? '計測を中止しました'
            : '計測がタイムアウトしました（30秒）',
        );
        return;
      }

      setStatus('error');
      if (e instanceof ApiError) {
        setErrorMessage(`API エラー（HTTP ${e.status}）`);
      } else if (e instanceof Error) {
        setErrorMessage(e.message);
      } else {
        setErrorMessage('計測に失敗しました。');
      }
    }
  }, [
    accessToken,
    selectedSizeMb,
    clearMeasureTimeout,
    releaseAbortController,
  ]);

  const cancelMeasure = useCallback(() => {
    cancelledByUserRef.current = true;
    clearMeasureTimeout();
    abortRef.current?.abort();
  }, [clearMeasureTimeout]);

  const resetForRetry = useCallback(() => {
    cancelledByUserRef.current = false;
    setErrorMessage(null);
    setResultMbps(null);
    setElapsedMs(null);
    setStatus('idle');
  }, []);

  const sizeDisabled = status !== 'idle';
  const canStart = status === 'idle' && (accessToken ?? '').length > 0;

  return (
    <AppLayout>
      <nav className={styles.breadcrumb}>
        <Link to="/" className={styles.breadcrumbLink}>
          ツール一覧
        </Link>
        <span className={styles.breadcrumbSep}>›</span>
        <span>ダウンロード速度測定</span>
      </nav>
      <h1 className={styles.pageTitle}>ダウンロード速度測定</h1>
      <p className={styles.pageSubtitle}>
        サーバーから指定サイズのデータを取得し、下り方向の速度を Mbps
        で推定します。
      </p>

      <p className={styles.sectionLabel}>計測サイズ</p>
      <div className={styles.sizeRow}>
        {([10, 50, 100] as const).map((mb) => (
          <button
            key={mb}
            type="button"
            className={`${styles.sizeBtn} ${selectedSizeMb === mb ? styles.sizeBtnActive : ''}`}
            disabled={sizeDisabled}
            onClick={() => setSelectedSizeMb(mb)}
          >
            {mb} MB
          </button>
        ))}
      </div>

      <div className={styles.actionRow}>
        <button
          type="button"
          className={styles.primaryBtn}
          disabled={!canStart}
          onClick={() => void startMeasure()}
        >
          計測開始
        </button>
        {status === 'measuring' ? (
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={cancelMeasure}
          >
            計測中止
          </button>
        ) : null}
      </div>

      {status === 'measuring' ? (
        <div className={styles.loadingRoot}>
          <div className={styles.spinnerLg} aria-hidden="true" />
          <p className={styles.loadingLabel}>
            データを取得しています（最大 {TIMEOUT_MS / 1000} 秒で打ち切ります）…
          </p>
        </div>
      ) : null}

      {status === 'done' && resultMbps != null && elapsedMs != null ? (
        <div className={styles.resultCard}>
          <p className={styles.resultMbps}>{resultMbps.toFixed(2)} Mbps</p>
          <p className={styles.resultMeta}>
            計測サイズ: {selectedSizeMb} MB
            <br />
            所要時間: {(elapsedMs / 1000).toFixed(2)} 秒
          </p>
        </div>
      ) : null}

      {status === 'error' && errorMessage != null ? (
        <>
          <div className={styles.errorBanner} role="alert">
            <span aria-hidden="true">!</span>
            <span>
              <em className={styles.errorBannerEm}>エラー —</em> {errorMessage}
            </span>
          </div>
          <button
            type="button"
            className={styles.retryBtn}
            onClick={resetForRetry}
          >
            再試行
          </button>
        </>
      ) : null}
    </AppLayout>
  );
}
