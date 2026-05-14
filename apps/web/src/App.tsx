import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/auth-context';
import AppRoutes from './routes/AppRoutes';

/**
 * アプリのルートコンポーネント。
 *
 * `BrowserRouter` と `AuthProvider` を配置して、ルーティングと認証状態をアプリ全体へ提供する。
 */
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
