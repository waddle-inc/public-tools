import AppLayout from '../../layouts/AppLayout';
import { TOOLS } from '../../lib/tools';
import styles from './ToolListPage.module.css';

/**
 * ツール一覧ページ。
 */
export default function ToolListPage() {
  return (
    <AppLayout>
      <h1 className={styles.sectionHeading}>ツール一覧</h1>

      {TOOLS.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon} aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M7 4.5h7.3L19 9.2V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 19V6A1.5 1.5 0 0 1 7.5 4.5Z"
                stroke="#8a96aa"
                strokeWidth="1.3"
              />
              <path d="M14 4.8V9h4.1" stroke="#8a96aa" strokeWidth="1.3" />
            </svg>
          </div>
          <h2 className={styles.emptyTitle}>ツールはまだありません</h2>
          <p className={styles.emptyBody}>
            利用可能なツールが追加されると、
            <br />
            ここに表示されます。
          </p>
        </div>
      ) : (
        <div className={styles.grid} aria-label="ツール一覧">
          {TOOLS.map((tool) => (
            <a key={tool.id} href={tool.path} className={styles.card}>
              <h2 className={styles.cardName}>{tool.name}</h2>
              <p className={styles.cardDesc}>{tool.description}</p>
              <span className={styles.cardLink}>開く →</span>
            </a>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
