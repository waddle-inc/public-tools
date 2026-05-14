import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/use-auth';
import styles from './AppLayout.module.css';

type AppLayoutProps = {
  children: ReactNode;
};

/**
 * 認証済みページ共通のレイアウト。
 */
export default function AppLayout({ children }: AppLayoutProps) {
  const { user, status, error, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (status === 'unauthenticated') {
      const redirect = encodeURIComponent(location.pathname + location.search);
      void navigate(`/login?redirect=${redirect}`, { replace: true });
    }
  }, [status, navigate, location.pathname, location.search]);

  if (status === 'unauthenticated') {
    return null;
  }

  const isReady = status === 'authenticated';

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerLogo}>
          <img
            src="/company-logo.png"
            alt=""
            className={styles.headerLogoImg}
          />
          <span className={styles.headerWordmark}>Waddle</span>
          <span className={styles.headerTag}>Tools</span>
        </div>
        <div className={styles.headerActions}>
          {user?.email && (
            <span className={styles.headerUser}>{user.email}</span>
          )}
          <button
            type="button"
            className={styles.btnLogout}
            onClick={logout}
            disabled={!isReady}
          >
            ログアウト
          </button>
        </div>
      </header>

      {status === 'loading' && (
        <div className={styles.loadingRoot}>
          <div className={styles.spinnerLg} aria-hidden="true" />
          <p className={styles.loadingLabel}>認証状態を確認しています...</p>
        </div>
      )}

      {status === 'error' && (
        <main className={styles.errorRoot}>
          <div className={styles.errorBanner} role="alert">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              style={{ flexShrink: 0, marginTop: 1 }}
            >
              <circle cx="8" cy="8" r="7" stroke="#a03030" strokeWidth="1.2" />
              <path
                d="M8 5v4"
                stroke="#a03030"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
              <circle cx="8" cy="11" r="0.8" fill="#a03030" />
            </svg>
            <span>
              <em className={styles.errorBannerEm}>エラーが発生しました —</em>{' '}
              {error ??
                '認証状態の取得に失敗しました。再度ログインしてください。'}
            </span>
          </div>
          <a href="/login" className={styles.reloginLink}>
            再ログインする →
          </a>
        </main>
      )}

      {status === 'authenticated' && (
        <main className={styles.main}>{children}</main>
      )}
    </div>
  );
}
