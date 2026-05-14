import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout';
import { ApiError, fetchSummarize, type SummarizeRequest } from '../../lib/api';
import { useAuth } from '../../contexts/use-auth';
import styles from './SummarizePage.module.css';

type SummarizeStatus = 'idle' | 'loading' | 'done' | 'error';

type LengthChoice = SummarizeRequest['length'];

const LENGTH_OPTIONS: { value: LengthChoice; label: string }[] = [
  { value: 'short', label: '短め' },
  { value: 'medium', label: '普通' },
  { value: 'long', label: '詳しく' },
];

/**
 * Gemini API 経由で入力テキストの要約を表示するページ。
 */
export default function SummarizePage() {
  const { accessToken, refreshAccessToken } = useAuth();
  const [status, setStatus] = useState<SummarizeStatus>('idle');
  const [text, setText] = useState('');
  const [length, setLength] = useState<LengthChoice>('medium');
  const [summary, setSummary] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputsDisabled = status === 'loading';
  const canRun =
    status !== 'loading' &&
    (accessToken ?? '').length > 0 &&
    text.trim().length > 0;

  const runSummarize = useCallback(async () => {
    setErrorMessage(null);
    setSummary(null);
    setStatus('loading');

    try {
      const body: SummarizeRequest = {
        text: text.trim(),
        length,
      };
      const res = await fetchSummarize(
        accessToken ?? '',
        refreshAccessToken,
        body,
      );
      setSummary(res.summary);
      setStatus('done');
    } catch (e) {
      setStatus('error');
      if (e instanceof ApiError) {
        if (e.status === 429) {
          setErrorMessage(
            'Gemini API の利用上限に達しました。しばらく待ってから再度お試しください。',
          );
        } else {
          setErrorMessage(`API エラー（HTTP ${e.status}）`);
        }
      } else if (e instanceof Error) {
        setErrorMessage(e.message);
      } else {
        setErrorMessage('要約に失敗しました。');
      }
    }
  }, [accessToken, length, refreshAccessToken, text]);

  const resetForRetry = useCallback(() => {
    setErrorMessage(null);
    setSummary(null);
    setStatus('idle');
  }, []);

  return (
    <AppLayout>
      <nav className={styles.breadcrumb}>
        <Link to="/" className={styles.breadcrumbLink}>
          ツール一覧
        </Link>
        <span className={styles.breadcrumbSep}>›</span>
        <span>文章要約</span>
      </nav>
      <h1 className={styles.pageTitle}>文章要約</h1>
      <p className={styles.pageSubtitle}>
        テキストを入力し、長さを選んでから要約を実行します（Gemini API）。
      </p>

      <p className={styles.sectionLabel}>要約するテキスト</p>
      <textarea
        className={styles.textArea}
        value={text}
        onChange={(ev) => setText(ev.target.value)}
        disabled={inputsDisabled}
        placeholder="ここに要約したい文章を入力してください。"
        aria-label="要約対象のテキスト"
      />

      <p className={styles.sectionLabel}>要約の長さ</p>
      <div className={styles.sizeRow}>
        {LENGTH_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`${styles.sizeBtn} ${length === opt.value ? styles.sizeBtnActive : ''}`}
            disabled={inputsDisabled}
            onClick={() => setLength(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className={styles.actionRow}>
        <button
          type="button"
          className={styles.primaryBtn}
          disabled={!canRun}
          onClick={() => void runSummarize()}
        >
          要約を実行
        </button>
      </div>

      {status === 'loading' ? (
        <div className={styles.loadingRoot}>
          <div className={styles.spinnerLg} aria-hidden="true" />
          <p className={styles.loadingLabel}>要約を取得しています…</p>
        </div>
      ) : null}

      {status === 'done' && summary != null ? (
        <div className={styles.resultCard}>
          <p className={styles.resultSummary}>{summary}</p>
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
            閉じる
          </button>
        </>
      ) : null}
    </AppLayout>
  );
}
