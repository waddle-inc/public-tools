import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout';
import { getBrowserInfo } from '../../lib/api';
import { useAuth } from '../../contexts/use-auth';
import styles from './BrowserInfoPage.module.css';

type BrowserDetails = {
  userAgent: string;
  language: string;
  languages: string;
  platform: string;
  vendor: string;
  timezone: string;
  screenResolution: string;
  availableScreenSize: string;
  screenOrientation: string;
  colorDepth: string;
  viewportSize: string;
  devicePixelRatio: string;
  hardwareConcurrency: string;
  maxTouchPoints: string;
  deviceMemory: string;
  networkEffectiveType: string;
  networkDownlink: string;
  networkRtt: string;
  networkSaveData: string;
  onLine: string;
  cookieEnabled: string;
  colorScheme: string;
  reducedMotion: string;
  highContrast: string;
};

function collectBrowserDetails(): BrowserDetails {
  const extendedNavigator = navigator as Navigator & {
    deviceMemory?: number;
    connection?: {
      effectiveType?: string;
      downlink?: number;
      rtt?: number;
      saveData?: boolean;
    };
  };
  const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const reducedMotionQuery = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  );
  const highContrastQuery = window.matchMedia('(prefers-contrast: more)');
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const connection = extendedNavigator.connection;

  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: navigator.languages.join(', '),
    platform: navigator.platform || '不明',
    vendor: navigator.vendor || '不明',
    timezone: timezone || '不明',
    screenResolution: `${window.screen.width} x ${window.screen.height}`,
    availableScreenSize: `${window.screen.availWidth} x ${window.screen.availHeight}`,
    screenOrientation: window.screen.orientation?.type ?? '不明',
    colorDepth: String(window.screen.colorDepth),
    viewportSize: `${window.innerWidth} x ${window.innerHeight}`,
    devicePixelRatio: String(window.devicePixelRatio),
    hardwareConcurrency:
      navigator.hardwareConcurrency != null
        ? String(navigator.hardwareConcurrency)
        : '不明',
    maxTouchPoints: String(navigator.maxTouchPoints ?? 0),
    deviceMemory:
      extendedNavigator.deviceMemory != null
        ? `${String(extendedNavigator.deviceMemory)} GB`
        : '取得不可',
    networkEffectiveType: connection?.effectiveType ?? '取得不可',
    networkDownlink:
      connection?.downlink != null
        ? `${String(connection.downlink)} Mbps`
        : '取得不可',
    networkRtt:
      connection?.rtt != null ? `${String(connection.rtt)} ms` : '取得不可',
    networkSaveData:
      connection?.saveData != null
        ? connection.saveData
          ? '有効'
          : '無効'
        : '取得不可',
    onLine: navigator.onLine ? 'オンライン' : 'オフライン',
    cookieEnabled: navigator.cookieEnabled ? '有効' : '無効',
    colorScheme: darkModeQuery.matches ? 'dark' : 'light',
    reducedMotion: reducedMotionQuery.matches ? '有効' : '無効',
    highContrast: highContrastQuery.matches ? '有効' : '無効',
  };
}

/**
 * ブラウザとサーバーの両方から取得した情報を表示するページ。
 */
export default function BrowserInfoPage() {
  const { accessToken, refreshAccessToken } = useAuth();
  const [clientIp, setClientIp] = useState<string | null>('取得中...');
  const [browserDetails, setBrowserDetails] = useState<BrowserDetails | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const [serverInfo, details] = await Promise.all([
          getBrowserInfo(accessToken ?? '', refreshAccessToken),
          Promise.resolve(collectBrowserDetails()),
        ]);
        if (!isMounted) {
          return;
        }
        setClientIp(serverInfo.client_ip);
        setBrowserDetails(details);
      } catch (e) {
        if (!isMounted) {
          return;
        }
        setClientIp(null);
        setError(e instanceof Error ? e.message : '情報の取得に失敗しました。');
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [accessToken, refreshAccessToken]);
  const isApiError = error != null;

  const badgeClass = (value: string) => {
    if (value === 'オンライン' || value === '有効') {
      return styles.badgeSuccess;
    }
    if (
      value === 'オフライン' ||
      value === '無効' ||
      value === 'light' ||
      value === 'dark'
    ) {
      return styles.badgeNeutral;
    }
    return '';
  };

  const renderValueCell = (value: string) => {
    const className = badgeClass(value);
    return className ? <span className={className}>{value}</span> : value;
  };

  return (
    <AppLayout>
      <nav className={styles.breadcrumb}>
        <Link to="/" className={styles.breadcrumbLink}>
          ツール一覧
        </Link>
        <span className={styles.breadcrumbSep}>›</span>
        <span>ブラウザ情報</span>
      </nav>
      <h1 className={styles.pageTitle}>ブラウザ情報</h1>
      <p className={styles.pageSubtitle}>
        現在のブラウザと端末の環境情報を表示しています。
      </p>

      {isApiError ? (
        <div className={styles.errorBanner} role="alert">
          <span aria-hidden="true">!</span>
          <span>
            <em className={styles.errorBannerEm}>エラーが発生しました —</em> IP
            アドレスの取得に失敗しました。その他の情報は表示されています。
          </span>
        </div>
      ) : null}

      {!browserDetails && !error ? (
        <div className={styles.loadingRoot}>
          <div className={styles.spinnerLg} aria-hidden="true" />
          <p className={styles.loadingLabel}>ブラウザ情報を取得しています...</p>
        </div>
      ) : null}

      {browserDetails ? (
        <>
          <p className={styles.sectionHeading}>ネットワーク</p>
          <table className={styles.table}>
            <tbody>
              <tr className={styles.tableRow}>
                <th className={styles.th}>IP アドレス</th>
                <td className={styles.td}>
                  {clientIp == null && isApiError ? (
                    <span className={styles.badgeError}>取得失敗</span>
                  ) : (
                    (clientIp ?? '取得不可')
                  )}
                </td>
              </tr>
              <tr className={styles.tableRow}>
                <th className={styles.th}>オンライン状態</th>
                <td className={styles.td}>
                  {renderValueCell(browserDetails.onLine)}
                </td>
              </tr>
              <tr className={styles.tableRow}>
                <th className={styles.th}>ネットワーク接続速度</th>
                <td className={styles.td}>
                  {browserDetails.networkEffectiveType}
                </td>
              </tr>
              <tr className={styles.tableRow}>
                <th className={styles.th}>推定下り帯域</th>
                <td className={styles.td}>{browserDetails.networkDownlink}</td>
              </tr>
              <tr className={styles.tableRow}>
                <th className={styles.th}>往復遅延</th>
                <td className={styles.td}>{browserDetails.networkRtt}</td>
              </tr>
              <tr className={styles.tableRow}>
                <th className={styles.th}>データセーバー</th>
                <td className={styles.td}>
                  {renderValueCell(browserDetails.networkSaveData)}
                </td>
              </tr>
            </tbody>
          </table>

          <p className={styles.sectionHeading}>ブラウザ</p>
          <table className={styles.table}>
            <tbody>
              <tr className={styles.tableRow}>
                <th className={styles.th}>ユーザーエージェント</th>
                <td className={styles.td}>{browserDetails.userAgent}</td>
              </tr>
              <tr className={styles.tableRow}>
                <th className={styles.th}>言語設定</th>
                <td className={styles.td}>
                  {browserDetails.language} ({browserDetails.languages})
                </td>
              </tr>
              <tr className={styles.tableRow}>
                <th className={styles.th}>プラットフォーム</th>
                <td className={styles.td}>{browserDetails.platform}</td>
              </tr>
              <tr className={styles.tableRow}>
                <th className={styles.th}>ベンダー</th>
                <td className={styles.td}>{browserDetails.vendor}</td>
              </tr>
              <tr className={styles.tableRow}>
                <th className={styles.th}>Cookie 有効</th>
                <td className={styles.td}>
                  {renderValueCell(browserDetails.cookieEnabled)}
                </td>
              </tr>
            </tbody>
          </table>

          <p className={styles.sectionHeading}>画面・ビューポート</p>
          <table className={styles.table}>
            <tbody>
              <tr className={styles.tableRow}>
                <th className={styles.th}>画面解像度</th>
                <td className={styles.td}>{browserDetails.screenResolution}</td>
              </tr>
              <tr className={styles.tableRow}>
                <th className={styles.th}>利用可能画面サイズ</th>
                <td className={styles.td}>
                  {browserDetails.availableScreenSize}
                </td>
              </tr>
              <tr className={styles.tableRow}>
                <th className={styles.th}>ビューポートサイズ</th>
                <td className={styles.td}>{browserDetails.viewportSize}</td>
              </tr>
              <tr className={styles.tableRow}>
                <th className={styles.th}>画面の向き</th>
                <td className={styles.td}>
                  {browserDetails.screenOrientation}
                </td>
              </tr>
              <tr className={styles.tableRow}>
                <th className={styles.th}>色深度</th>
                <td className={styles.td}>{browserDetails.colorDepth} bit</td>
              </tr>
              <tr className={styles.tableRow}>
                <th className={styles.th}>デバイスピクセル比</th>
                <td className={styles.td}>{browserDetails.devicePixelRatio}</td>
              </tr>
            </tbody>
          </table>

          <p className={styles.sectionHeading}>デバイス</p>
          <table className={styles.table}>
            <tbody>
              <tr className={styles.tableRow}>
                <th className={styles.th}>タイムゾーン</th>
                <td className={styles.td}>{browserDetails.timezone}</td>
              </tr>
              <tr className={styles.tableRow}>
                <th className={styles.th}>CPU コア数</th>
                <td className={styles.td}>
                  {browserDetails.hardwareConcurrency}
                </td>
              </tr>
              <tr className={styles.tableRow}>
                <th className={styles.th}>タッチポイント数</th>
                <td className={styles.td}>{browserDetails.maxTouchPoints}</td>
              </tr>
              <tr className={styles.tableRow}>
                <th className={styles.th}>デバイスメモリ</th>
                <td className={styles.td}>{browserDetails.deviceMemory}</td>
              </tr>
            </tbody>
          </table>

          <p className={styles.sectionHeading}>ユーザー設定</p>
          <table className={styles.table}>
            <tbody>
              <tr className={styles.tableRow}>
                <th className={styles.th}>カラースキーム</th>
                <td className={styles.td}>
                  {renderValueCell(browserDetails.colorScheme)}
                </td>
              </tr>
              <tr className={styles.tableRow}>
                <th className={styles.th}>アニメーション軽減</th>
                <td className={styles.td}>
                  {renderValueCell(browserDetails.reducedMotion)}
                </td>
              </tr>
              <tr className={styles.tableRow}>
                <th className={styles.th}>ハイコントラスト</th>
                <td className={styles.td}>
                  {renderValueCell(browserDetails.highContrast)}
                </td>
              </tr>
            </tbody>
          </table>
        </>
      ) : null}
    </AppLayout>
  );
}
