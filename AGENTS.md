# 開発ガイド - Waddle Inc. ツールサービス

このファイルは、リポジトリで作業する開発者と AI エージェント（Claude Code・Cursor）向けのルールと手順をまとめたガイドです。

## 概要

このリポジトリはツールサービスのバックエンドとフロントエンドを含んでいます。

- FastAPI + uv で構築したツールサービス API（バックエンド）
- React + Vite を使用したツールサービス WEB（フロントエンド）

認証は `waddle-inc/auth`（別リポジトリ）を利用します。

## ディレクトリ構造

```
.
├── .agents/                        # スキル・フック実体
├── .claude/                        # Claude Code 用設定
├── .cursor/                        # Cursor 用設定
├── apps/
│   ├── api/                       # ツールサービス API（FastAPI）
│   └── web/                       # ツールサービス WEB（React + Vite）
├── docs/                           # ドキュメント
├── mockups/                        # UI モックアップ（静的 HTML）
├── AGENTS.md                       # 開発ガイド（本ファイル）
├── Makefile                        # 主要コマンド
└── README.md                       # リポジトリ概要と導線
```

## 言語ルール

- このリポジトリでの作業は全て**日本語**で行ってください。（Git・GitHub・PR・コード内のコメント含む）

## コミットルール

- コミットメッセージは [Conventional Commits](https://www.conventionalcommits.org/) 形式を使用します。
- コミットメッセージは **日本語** を使用します。（英語禁止）
- コミットメッセージのタイトルは 50 文字以内に収めてください。

## PRルール

- PRタイトルは [Conventional Commits](https://www.conventionalcommits.org/) 形式を使用します。
- PRタイトルは **日本語** を使用します。（英語禁止）
- PR本文は `.github/PULL_REQUEST_TEMPLATE.md` の構成・見出しに従って作成してください。
- PR本文は **日本語** を使用します。（英語禁止）

## 実装ルール

実装を追加・修正する際は以下を実施してください。

### ドキュメント更新

**影響する `docs/` 配下のドキュメントも合わせて更新してください。**

### モックアップ更新

**影響する `mockups/` 配下のモックアップも合わせて更新してください。**

### OpenAPI 更新

API を追加・修正した場合は OpenAPI スキーマと TypeScript 型を更新してください。

```bash
# 認証システム API の OpenAPI スキーマから Pydantic 型を生成
# ツールサービス API の TypeScript 型を生成
make gen
```

### 目次更新

ドキュメントを更新した場合は、`<!-- toc -->` と `<!-- tocstop -->` のマーカーを持つ Markdown ファイルの目次を更新してください。

```bash
make toc
```

### フォーマット整形・静的解析・ビルド・単体テスト・E2Eテスト

**必ずフォーマット整形・静的解析・ビルド・単体テスト・E2Eテストを実施してください。**

| コマンド      | 説明             |
| ------------- | ---------------- |
| `make format` | フォーマット整形 |
| `make lint`   | 静的解析         |
| `make build`  | ビルド           |

#### 単体テスト

| コマンド        | 対象     |
| --------------- | -------- |
| `make test`     | API・WEB |
| `make test-api` | API のみ |
| `make test-web` | WEB のみ |

#### E2Eテスト

| コマンド            | 対象     |
| ------------------- | -------- |
| `make test-e2e`     | API・WEB |
| `make test-e2e-api` | API のみ |
| `make test-e2e-web` | WEB のみ |

## セットアップ

AI エージェントは自動でセットアップされますが、開発者は手動でセットアップする必要があります。

### AI エージェント向け

AI エージェントの環境では起動時に次のファイルが実行されるため、セットアップ済みの想定です。  
セットアップに不足がある場合は、報告してください。

- Claude Code は `.claude/hooks/setup-web.sh`
- Cursor は `.cursor/worktrees.json`

### 開発者向け

開発者は次の手順でセットアップしてください。

**前提条件**

- [mise](https://mise.jdx.dev/)（開発ツールのバージョン管理）がインストール済み

**手順**

```bash
# 設定ファイルを信頼（mise）
mise trust

# 依存ツール・依存パッケージをインストール
make setup
```

## 開発フロー

### アプリケーションの起動

```bash
# 開発サーバを起動
make dev
```

| URL                   | 説明               |
| --------------------- | ------------------ |
| http://localhost:3001 | ツールサービス WEB |
| http://localhost:8001 | ツールサービス API |

### 開発コマンド

| コマンド            | 説明                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `make test-all`     | 単体テスト・E2Eテスト（API・WEB）                                                                                 |
| `make check`        | 目次自動生成・OpenAPI スキーマから型を生成・フォーマット整形・静的解析・ビルド・単体テスト・E2Eテスト（API・WEB） |
| `make check-no-e2e` | 目次自動生成・OpenAPI スキーマから型を生成・フォーマット整形・静的解析・ビルド・単体テスト（API・WEB）            |

## 目次の新規作成

新しいドキュメントに目次を追加する場合は、目次を挿入したい位置に以下を記述して `make toc` を実行してください。

```markdown
## 目次

<!-- toc -->
<!-- tocstop -->
```

## スキル・フック

AI エージェント向けのスキルとフックスクリプトは `.agents/` に実体ファイルを置き、各ツールのディレクトリからシンボリックリンクで参照します。  
追加・編集する場合は `.agents/` 配下のファイルを操作してください。`.claude/` や `.cursor/` 側は自動的に同じ内容を参照します。

```
.agents/skills/<skill-name>/SKILL.md   # スキルの実体
.agents/hooks/<script>.sh              # フックスクリプトの実体

.claude/skills/<skill-name>/SKILL.md   # → .agents/ へのシンボリックリンク
.claude/hooks/<script>.sh              # → .agents/ へのシンボリックリンク
.cursor/skills/<skill-name>/SKILL.md   # → .agents/ へのシンボリックリンク
.cursor/hooks/<script>.sh              # → .agents/ へのシンボリックリンク
```

フックのイベント設定はツール固有のため、`.claude/settings.json`（Claude Code）と `.cursor/hooks.json`（Cursor）をそれぞれ編集してください。

特定のツール専用のフックスクリプトは `.agents/` に置かず、各ツールのフックディレクトリに直接配置します。  
例: `.claude/hooks/setup-web.sh`（Claude Code の SessionStart 専用）

## 認証

認証は `api.auth.waddle-inc.com` を利用します。  
詳細は [waddle-inc/auth](https://github.com/waddle-inc/auth) を参照してください。

## 関連ドキュメント

用途に応じて次のドキュメントを参照してください。

| 説明                           | 参照先                                           |
| ------------------------------ | ------------------------------------------------ |
| リポジトリ概要と導線           | [README.md](./README.md)                         |
| ドキュメント（設計・仕様）     | [docs/README.md](./docs/README.md)               |
| ドキュメント（外部アプリ向け） | [docs/public/README.md](./docs/public/README.md) |
| モックアップ                   | [mockups/README.md](./mockups/README.md)         |
