# ブラウザ情報画面

**パス:** `/tools/browser-info`

**種別:** 要認証（未認証の場合は [`/login`](./login.md) へリダイレクト）

**使用 API:** `GET /tools/browser-info`

## 画面概要

ブラウザ API から取得できる環境情報と、バックエンドが認識したクライアント IP を 1 画面に一覧表示します。

## 表示項目

| 項目                 | 取得元                                                          |
| -------------------- | --------------------------------------------------------------- |
| IP アドレス          | `GET /tools/browser-info` の `client_ip`                        |
| ユーザーエージェント | `navigator.userAgent`                                           |
| 言語設定             | `navigator.language` / `navigator.languages`                    |
| プラットフォーム     | `navigator.platform`                                            |
| ベンダー             | `navigator.vendor`                                              |
| タイムゾーン         | `Intl.DateTimeFormat().resolvedOptions().timeZone`              |
| 画面解像度           | `screen.width` × `screen.height`                                |
| 利用可能画面サイズ   | `screen.availWidth` × `screen.availHeight`                      |
| 画面の向き           | `screen.orientation.type`                                       |
| 色深度               | `screen.colorDepth`                                             |
| ビューポートサイズ   | `window.innerWidth` × `window.innerHeight`                      |
| デバイスピクセル比   | `window.devicePixelRatio`                                       |
| CPU コア数           | `navigator.hardwareConcurrency`                                 |
| タッチポイント数     | `navigator.maxTouchPoints`                                      |
| デバイスメモリ       | `navigator.deviceMemory`                                        |
| ネットワーク接続速度 | `navigator.connection.effectiveType`                            |
| 推定下り帯域         | `navigator.connection.downlink`                                 |
| 往復遅延             | `navigator.connection.rtt`                                      |
| データセーバー       | `navigator.connection.saveData`                                 |
| オンライン状態       | `navigator.onLine`                                              |
| Cookie 有効          | `navigator.cookieEnabled`                                       |
| カラースキーム       | `window.matchMedia('(prefers-color-scheme: dark)').matches`     |
| アニメーション軽減   | `window.matchMedia('(prefers-reduced-motion: reduce)').matches` |
| ハイコントラスト     | `window.matchMedia('(prefers-contrast: more)').matches`         |

## データ取得フロー

1. 初回マウント時にブラウザ API で情報を収集
2. 同時に `GET /tools/browser-info` を呼び出して `client_ip` を取得
3. 両方の結果を画面のテーブルに表示

## エラーハンドリング

| エラー           | 表示・処理                                            |
| ---------------- | ----------------------------------------------------- |
| API 呼び出し失敗 | エラーメッセージを表示し、IP アドレス欄は取得失敗扱い |

## 関連設計

- API 仕様: [API 仕様](../../api/api.md)
- ルート保護: [ルート保護設計](../routing.md)
