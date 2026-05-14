# コーディング規約 - Waddle Inc. ツールサービス WEB

このドキュメントはツールサービス WEB のコーディング規約を記述しています。

---

## 目次

<!-- toc -->

- [基本方針](#%E5%9F%BA%E6%9C%AC%E6%96%B9%E9%87%9D)
- [レイヤー責務](#%E3%83%AC%E3%82%A4%E3%83%A4%E3%83%BC%E8%B2%AC%E5%8B%99)
- [TypeScript / React](#typescript--react)
- [JSDoc とコメント](#jsdoc-%E3%81%A8%E3%82%B3%E3%83%A1%E3%83%B3%E3%83%88)
- [認証とルーティング](#%E8%AA%8D%E8%A8%BC%E3%81%A8%E3%83%AB%E3%83%BC%E3%83%86%E3%82%A3%E3%83%B3%E3%82%B0)
- [API 通信とエラー処理](#api-%E9%80%9A%E4%BF%A1%E3%81%A8%E3%82%A8%E3%83%A9%E3%83%BC%E5%87%A6%E7%90%86)
- [スタイル](#%E3%82%B9%E3%82%BF%E3%82%A4%E3%83%AB)
- [テスト](#%E3%83%86%E3%82%B9%E3%83%88)
- [関連ドキュメント](#%E9%96%A2%E9%80%A3%E3%83%89%E3%82%AD%E3%83%A5%E3%83%A1%E3%83%B3%E3%83%88)

<!-- tocstop -->

## 基本方針

- React + Vite + TypeScript を前提に、型を明示します。
- コメント・JSDoc・エラーメッセージ・テスト名は日本語を基本にします。
- 実装は既存のレイヤー構成（App / Router / Page / Component / Context / API Client / Silent Refresh）に沿って配置します。
- 新しい抽象化は、責務分離や重複削減に明確な効果がある場合だけ追加します。
- 認証・トークン・外部 API 連携は、画面コンポーネントへ直接広げず、既存の Context と `lib/` に集約します。

## レイヤー責務

- `src/main.tsx` は React のエントリポイントとして、`#root` へのマウントに限定します。
- `src/App.tsx` は `BrowserRouter`、`AuthProvider`、`AppRoutes` などアプリ全体の Provider と Router の組み立てを担当します。
- `src/routes/` は URL パスと Page の対応、未定義ルートのリダイレクトを担当します。
- `src/pages/` はルーティング単位の画面を置き、認証状態に応じた表示分岐や画面遷移の起点を担当します。
- `src/components/` は再利用する UI 部品を置き、認証状態の保持や API 通信の詳細は持たせません。
- `src/contexts/` はアプリ全体の状態を保持し、現在は認証状態、ユーザー情報、アクセストークンをメモリで管理します。
- `src/lib/api.ts` はツールサービス API（バックエンド）との通信、認証ヘッダー付与、HTTP エラーの変換を担当します。
- `src/lib/silent-refresh.ts` は認証 WEB（フロントエンド）との iframe / `postMessage` によるサイレントリフレッシュを担当します。

## TypeScript / React

- コンポーネントは関数コンポーネントで実装します。
- Props や Context の公開値は `interface` または `type` で明示します。
- 型だけの import は `import type` を使用します。
- 非同期処理を `useEffect` 内で実行する場合は、内部関数を定義し `void initialize()` のように呼び出します。
- アンマウント後に状態更新が起きる可能性がある非同期処理では、マウント状態を確認するガードを置きます。
- 画面遷移は React Router の `navigate` を優先し、外部認証 WEB への遷移は `window.location.href` を使用します。
- `import.meta.env` から取得する環境変数は、利用するモジュールの先頭で定数化します。

## JSDoc とコメント

- 公開コンポーネント、公開関数、公開クラス、主要な型には短い JSDoc を付けます。
- JSDoc は「何をするか」だけでなく、責務・意図・境界が伝わる表現を優先します。
- 引数と戻り値の説明は、画面遷移、認証、外部通信など読み手の理解に影響する場合に書きます。
- 処理コメントは、認証状態の分岐、サイレントリフレッシュ、タイムアウト、リトライなど意図が重要な箇所に限定します。
- テストにも、モジュール、ヘルパー、主要ケースの意図を短く書きます。

## 認証とルーティング

- 認証状態は `AuthContext` を通じて配布し、Page や Component で独自に保持しません。
- ツールサービス向けアクセストークンとユーザー情報は React Context のメモリに保持し、`localStorage` や `sessionStorage` には保存しません。
- `/` は要認証ルートとして扱い、未認証時は [`/login`](./screens/login.md) へ誘導します。
- `/auth/callback` は SSO コールバック用の中立ルートとして扱い、クエリ `code` の検証を `AuthProvider` に委譲します。
- 未定義ルートは `/` へリダイレクトします。
- ログイン URL やコールバック URL を組み立てる場合は、`redirect` の値を `encodeURIComponent` でエンコードします。

## API 通信とエラー処理

- ツールサービス API（バックエンド）への通信は `src/lib/api.ts` に集約します。
- JSON リクエストには `Content-Type: application/json` を付与します。
- 認証が必要なリクエストでは `Authorization: Bearer ...` を付与します。
- `401 Unauthorized` を受け取った場合は、サイレントリフレッシュで新しいトークンを取得できる場合に限り 1 回だけリトライします。
- API レスポンスが失敗した場合は `ApiError` に HTTP ステータスを保持して呼び出し元へ伝えます。
- `postMessage` を扱う場合は `event.origin` を検証し、想定外の送信元からのメッセージは無視します。
- iframe やイベントリスナーを使う処理では、成功・失敗・タイムアウト時にクリーンアップを行います。

## スタイル

- グローバル CSS は `src/index.css` に置き、アプリ固有のスタイルは必要に応じて `src/App.css` や対象コンポーネント近くに整理します。
- セマンティックな HTML を優先し、主要領域には `main`、情報のまとまりには `section`、定義情報には `dl` を使用します。
- エラーメッセージなど支援技術へ明示したい要素には `role="alert"` を付けます。
- ボタン操作には `button type="button"` を指定します。
- Phase 1-b では UI 部品の抽象化を急がず、再利用が明確になった時点で `src/components/` へ切り出します。

## テスト

- ユニットテストは Vitest + React Testing Library を使用します。
- テストファイルは原則として対象ソースと同じディレクトリに `*.test.tsx` として置きます。
- テスト名は日本語で、ユーザー視点または認証フロー上の期待動作を表します。
- `fetch`、API Client、サイレントリフレッシュ、React Router、`window.location` などの外部依存は `vi.fn()` / `vi.mock()` で差し替えます。
- Context のテストでは `renderHook` と wrapper を使い、Provider 経由の公開値を検証します。
- Page のテストでは `MemoryRouter` を使い、ルート遷移や表示結果を検証します。
- 認証フローでは、成功、未認証、API エラー、サイレントリフレッシュ失敗を優先して検証します。

## 関連ドキュメント

- [アーキテクチャ](./architecture.md)
- [テスト](./testing.md)
- [ルート保護設計](./routing.md)
- [トークン管理設計](./tokens.md)
