# Vela

地上デジタル放送向けの録画システムのフロントエンドです。

番組表の閲覧、予約、録画済み番組の検索と再生をブラウザから行います。録画そのものは
別リポジトリのバックエンドが担当し、その OpenAPI 文書から生成したクライアントで
接続します。

## 必要なもの

- Docker
- `CARINA_API_BASE_URL` に指定する稼働中のバックエンド

## セットアップ

```bash
task up
task dev          # http://localhost:8080
task storybook    # http://localhost:6006
```

Task を使わない場合:

```bash
docker compose up -d
docker compose exec app yarn install
docker compose exec app yarn dev
```

## 設定

| 変数 | 用途 |
| --- | --- |
| `CARINA_API_BASE_URL` | バックエンドの接続先。既定値はなく、未設定なら起動時に失敗します |
| `DEV_ALLOWED_ORIGINS` | 開発サーバが受け付けるホスト名。`localhost` 以外で開く場合に指定 |

`DEV_ALLOWED_ORIGINS` に無いホスト名でアクセスすると、開発サーバがチャンクと HMR の
接続を拒否します。

## API クライアント

`repository/client/` に OpenAPI 文書と、そこから生成したクライアントを置きます。
どちらもコミットします。

```bash
docker compose exec app yarn codegen:fetch    # 文書を再取得して再生成
docker compose exec app yarn codegen:verify   # 文書と生成物の差分を検出
```

`repository/` の外から生成クライアントを import することは eslint で禁止しています。

## 開発

```bash
task lint
task typecheck
task test:stories    # 実ブラウザで全 story を描画し、a11y 違反があれば失敗
```

コーディング規約とデザインシステムは `CLAUDE.md` にあります。
