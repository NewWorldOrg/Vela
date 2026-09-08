# Vela

日本の地上デジタル放送向けの録画システムのフロントエンド。番組表を見て予約し、録画済みの
番組を検索して再生するところまでをブラウザで行う。

録画そのものはバックエンドの [Carina](https://github.com/NewWorldOrg/Carina) が担当する。
Vela はそれが返す OpenAPI 文書から生成したクライアントで接続し、文書と生成物のどちらも
リポジトリに置いてあるので、バックエンドの契約が動いたことは `git diff` に出る。

## 必要なもの

Docker のみ。バックエンドが動いていなくても画面は立ち上がる。

## セットアップ

```bash
task up      # 開発コンテナ
task yarn    # 依存の取得
task dev     # http://localhost:8080
```

Storybook は `task storybook` で http://localhost:6006 に出る。

Task を使わない場合:

```bash
docker compose up -d
docker compose exec app yarn install
docker compose exec app yarn dev
```

開発サーバはコンテナの 3000 番で待ち受け、ホストの 8080 番に公開する。

## 設定

| 変数 | 用途 |
| --- | --- |
| `CARINA_API_BASE_URL` | バックエンドの接続先 |
| `DEV_ALLOWED_ORIGINS` | 開発サーバが受け付けるホスト名。カンマ区切り |

`CARINA_API_BASE_URL` にコード側の既定値は無い。未設定のまま API へ届く要求が来ると
`CARINA_API_BASE_URL is not set` で失敗する。開発では compose が
`http://host.docker.internal:8081` を渡すので、書かなくても立ち上がる。

`DEV_ALLOWED_ORIGINS` はポートを含まないホスト名を並べる(既定は `localhost,127.0.0.1`)。
ブラウザが実際に使うホスト名がここに無いと、開発サーバはチャンクと HMR の接続を拒む。

## API クライアント

バックエンドが返す OpenAPI 文書(`repository/client/carina.json`)と、そこから生成した型
(`repository/client/schema.ts`)はどちらもコミットする。

```bash
docker compose exec app yarn codegen:fetch    # 文書を取り直して型を作り直す
docker compose exec app yarn codegen:verify   # コミット済みの文書から作り直し、差があれば失敗する
```

`codegen:fetch` は `CARINA_API_BASE_URL` の `/openapi/v1.json` を読むので稼働中のバックエンドが要る。
`codegen:verify` は何も動いていなくても走るため、CI が回すのはこちら。

生成クライアントと `openapi-fetch` を `repository/` の外から import することは eslint が禁じている。

## 開発

```bash
task lint          # eslint + prettier --check
task typecheck     # tsc --noEmit
task test          # tests/ 以下の単体テスト
task test:stories  # 全 story を実ブラウザで light と dark の両方で描画し、a11y 違反があれば失敗
```

`task test:stories` は Playwright のイメージで Storybook をビルドして静的に配り、その上で
テストランナーを走らせる。

コーディング規約とデザインシステムは `CLAUDE.md` にある。
