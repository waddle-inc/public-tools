import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/use-auth';
import styles from './LoginPage.module.css';

const AUTH_WEB_URL = import.meta.env.VITE_AUTH_WEB_URL ?? '';

function getLoginUrl(): string {
  return `${AUTH_WEB_URL}/login?redirect=${encodeURIComponent(`${window.location.origin}/auth/callback`)}`;
}

export default function LoginPage() {
  const { status } = useAuth();
  const [searchParams] = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const isLoggedOut = searchParams.get('logout') === '1';

  useEffect(() => {
    if (status === 'authenticated') {
      window.location.href = '/';
    }
  }, [status]);

  const isRedirecting = status === 'loading' || status === 'authenticated';

  function handleLogin() {
    if (isRedirecting || isNavigating) return;
    setIsNavigating(true);
    const redirectPath = searchParams.get('redirect') ?? '/';
    sessionStorage.setItem('auth_redirect', redirectPath);
    window.location.href = getLoginUrl();
  }

  const buttonClassName = [
    styles.btnPrimary,
    isRedirecting
      ? styles.btnPrimaryDisabled
      : isNavigating
        ? styles.btnPrimaryLoading
        : '',
  ]
    .filter(Boolean)
    .join(' ');

  const buttonLabel = isRedirecting
    ? '移動中...'
    : isNavigating
      ? '認証ページへ移動中...'
      : 'ログインする →';

  const showSpinner = isRedirecting || isNavigating;

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
          <h1 className={styles.headline}>ようこそ</h1>
          <p className={styles.subhead}>
            ツールサービスへアクセスするには
            <br />
            ログインしてください。
          </p>
        </div>
        <hr className={styles.ruleLight} />
        {status === 'unauthenticated' && isLoggedOut && (
          <div className={styles.infoBanner}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              style={{ flexShrink: 0, marginTop: 1 }}
            >
              <circle cx="8" cy="8" r="7" stroke="#3a5298" strokeWidth="1.2" />
              <path
                d="M8 7v4"
                stroke="#3a5298"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
              <circle cx="8" cy="5" r="0.8" fill="#3a5298" />
            </svg>
            <span>
              <em>ログアウト完了 —</em> 再度ログインしてご利用ください。
            </span>
          </div>
        )}
        {status === 'authenticated' ? (
          <p className={styles.body}>
            認証済みです。ダッシュボードへ移動します...
          </p>
        ) : (
          <p className={styles.body}>
            認証システムへ移動してログインします。
            <br />
            完了後、このページへ自動的に戻ります。
          </p>
        )}
        <button
          type="button"
          className={buttonClassName}
          disabled={isRedirecting || isNavigating}
          onClick={handleLogin}
        >
          {showSpinner && (
            <span className={styles.spinner} aria-hidden="true" />
          )}
          <span>{buttonLabel}</span>
        </button>
        <p className={styles.copyright}>© 2026 Waddle Inc.</p>
      </div>
    </div>
  );
}
