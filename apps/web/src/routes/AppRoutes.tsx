import { Navigate, Route, Routes } from 'react-router-dom';
import AuthCallbackPage from '../pages/auth/AuthCallbackPage';
import LoginPage from '../pages/auth/LoginPage';
import BrowserInfoPage from '../pages/tools/BrowserInfoPage';
import DownloadSpeedPage from '../pages/tools/DownloadSpeedPage';
import SummarizePage from '../pages/tools/SummarizePage';
import ToolListPage from '../pages/tools/ToolListPage';

/**
 * アプリ内のルーティング定義。
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ToolListPage />} />
      <Route path="/tools/browser-info" element={<BrowserInfoPage />} />
      <Route path="/tools/download-speed" element={<DownloadSpeedPage />} />
      <Route path="/tools/summarize" element={<SummarizePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
