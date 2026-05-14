import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../contexts/use-auth';
import styles from './AuthCallbackPage.module.css';

/**
 * 認証コールバックページ。
 *
 * クエリ `code` を受け取り、`AuthProvider` に SSO コード検証を委譲する。
 *
 * @returns 認証コールバックページ
 */
export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthFromCode, error } = useAuth();
  const [isSuccess, setIsSuccess] = useState(false);
  const code = searchParams.get('code');

  useEffect(() => {
    // 認証コードがない場合はログイン画面へリダイレクト
    if (!code) {
      window.location.href = '/login';
      return;
    }

    // 認証コードがある場合は検証して元のページへ遷移
    setAuthFromCode(code)
      .then(() => {
        setIsSuccess(true);
        const redirectPath = sessionStorage.getItem('auth_redirect') ?? '/';
        sessionStorage.removeItem('auth_redirect');
        void navigate(redirectPath, { replace: true });
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          window.location.href = '/login';
        }
        // 400・500 の場合はエラー表示のため AuthContext の error を利用
      });
  }, [code, navigate, setAuthFromCode]);

  if (!code) {
    return null;
  }

  const isError = error !== null;
  const headline = isError ? '認証エラー' : isSuccess ? '認証完了' : '確認中';
  const subhead = isError
    ? '認証コードの検証に失敗しました'
    : isSuccess
      ? '元のページへ移動します'
      : 'SSO 認可コードを検証しています...';

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <p className={styles.meta}>Tools</p>
        <div className={styles.masthead}>
          <div className={styles.mastheadLogoRow}>
            <img
              src="/company-logo.png"
              alt=""
              className={styles.mastheadLogoImg}
            />
            <span className={styles.mastheadName}>Waddle</span>
          </div>
        </div>
        <hr className={styles.ruleDouble} />
        <div className={styles.headlineGroup}>
          <h1 className={styles.headline}>{headline}</h1>
          <p className={styles.subhead}>{subhead}</p>
        </div>
        <hr className={styles.ruleLight} />

        {isError ? (
          <>
            <div className={styles.errorBanner} role="alert">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                style={{ flexShrink: 0, marginTop: 1 }}
              >
                <circle
                  cx="8"
                  cy="8"
                  r="7"
                  stroke="#a03030"
                  strokeWidth="1.2"
                />
                <path
                  d="M8 5v4"
                  stroke="#a03030"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
                <circle cx="8" cy="11" r="0.8" fill="#a03030" />
              </svg>
              <span>
                <em className={styles.errorBannerEm}>認証に失敗しました —</em>{' '}
                再度ログインをお試しください。
              </span>
            </div>
            <p className={styles.body}>
              認証コードが無効または期限切れです。再度ログインしてください。
            </p>
            <a href="/login" className={styles.btnPrimary}>
              再ログインする →
            </a>
          </>
        ) : isSuccess ? (
          <>
            <p className={styles.body}>
              認証が完了しました。元のページへ移動します...
            </p>
            <button
              type="button"
              className={`${styles.btnPrimary} ${styles.btnPrimaryDisabled}`}
              disabled
            >
              <span className={styles.spinner} aria-hidden="true" />
              <span>移動中...</span>
            </button>
          </>
        ) : (
          <div className={styles.processing}>
            <div className={styles.spinnerLg} aria-hidden="true" />
            <p className={styles.processingLabel}>少々お待ちください</p>
          </div>
        )}

        <p className={styles.copyright}>© 2026 Waddle Inc.</p>
      </div>
    </div>
  );
}
