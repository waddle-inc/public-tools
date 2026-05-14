# 画面一覧

> **閲覧環境について**  
> Mermaid 図は [Mermaid 対応エディタ](https://mermaid.js.org/)（GitHub、Obsidian 等）で正しくレンダリングされます。

---

## 画面・パス一覧

| #   | パス                                           | 画面名               | 種別   | 使用 API エンドポイント           |
| --- | ---------------------------------------------- | -------------------- | ------ | --------------------------------- |
| 1   | [`/`](./tool-list.md)                          | ツール一覧           | 要認証 | なし                              |
| 2   | [`/login`](./login.md)                         | ログイン画面         | 公開   | なし                              |
| 3   | [`/auth/callback`](./auth-callback.md)         | SSO コールバック     | 中立   | `POST /auth/sso/verify`           |
| 4   | [`/tools/download-speed`](./download-speed.md) | ダウンロード速度測定 | 要認証 | `GET /tools/download-speed/chunk` |
| 5   | [`/tools/summarize`](./summarize.md)           | 文章要約             | 要認証 | `POST /tools/summarize`           |

**種別の定義:** [routing.md](../routing.md) を参照

**その他補足:**

- 未認証ユーザーが [`/`](./tool-list.md) へアクセスした場合は [`/login`](./login.md) へリダイレクトします
- [`/auth/callback`](./auth-callback.md) は認証 WEB（フロントエンド）から SSO 認可コードを受け取るための中立ルートです
- ログアウト専用画面は用意しません。ツール一覧画面のボタンで認証 WEB（フロントエンド）の `/logout`（`redirect` に [`/login`](./login.md) の完全 URL を付与）へ遷移し、認証システムのログアウト完了後に [`/login`](./login.md) へ戻ります
