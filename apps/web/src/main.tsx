import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

/**
 * React のエントリポイント。
 *
 * `#root` に `App` をマウントする。
 *
 * Playwright E2E（`vite --mode e2e`）では開発向け StrictMode の effect 再実行により
 * `window.location` への二重リダイレクトが起き、`net::ERR_ABORTED` で不安定になるため外す。
 */
const appTree =
  import.meta.env.MODE === 'e2e' ? (
    <App />
  ) : (
    <StrictMode>
      <App />
    </StrictMode>
  );

createRoot(document.getElementById('root')!).render(appTree);
