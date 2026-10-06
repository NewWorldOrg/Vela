# Vela

日本の地上デジタル放送向けの録画システムのフロントエンド。
番組表を見て予約し、録画済みの番組を検索して再生するところまでをブラウザで行う。
録画そのものはバックエンドの [Carina](https://github.com/NewWorldOrg/Carina) が担当する。

## 構成

Next.js(App Router)のサーバ。
画面はサーバ側で Carina の API から取得して描く(接続先は `CARINA_API_BASE_URL`)。
ブラウザが自分で出す要求(イベント・局のロゴ・再生・ライブ)は、`/api/*` として前段のプロキシから Carina に届く。
ディレクトリの構成、ビルド・試験のコマンド、コードの決まり、デザインシステムは `CLAUDE.md` にある。

## 必要なもの

Docker のみ。
バックエンドが動いていなくても画面は立ち上がる。

## セットアップ

```bash
task up      # 開発コンテナ
task yarn    # 依存の取得
task dev     # http://localhost:8080
```

Task を使わない場合:

```bash
docker compose up -d
docker compose exec app yarn install
docker compose exec app yarn dev
```

開発サーバはコンテナの 3000 番で待ち受け、ホストの 8080 番に公開する。
Storybook は `task storybook` で http://localhost:6006 に出る。

## 配置

前段にリバースプロキシを置き、同じオリジンで `/api/*` を Carina、それ以外を Vela に送る。
Vela は `/api/*` を中継しない。

- WebSocket(`/api/live/ws`)と SSE(`/api/events`)は切らず、溜めずに流す
- `Range` は素通しにする(録画の再生とシーク)

開発サーバを直接開くと、ブラウザが `/api/*` に出す要求は届かない。

## イメージ

`master` に入るたびに、CI が `ghcr.io/newworldorg/vela` へ `sha-<commit>` のタグで出す。
`<commit>` はそのコミットの先頭 12 桁で、対応する CPU は amd64 だけ。
一度出したタグの中身は変わらない。

イメージは 3000 番で待ち受け、uid 1001 で動く。
起動するときに `CARINA_API_BASE_URL` を渡す。

## 設定

| 変数 | 用途 |
| --- | --- |
| `CARINA_API_BASE_URL` | バックエンドの接続先 |
| `DEV_ALLOWED_ORIGINS` | 開発サーバが受け付けるホスト名。カンマ区切り、ポートは含めない |

`CARINA_API_BASE_URL` にコード側の既定値は無く、未設定のまま API へ届く要求が来ると失敗する。
開発では compose が渡すので、書かなくても立ち上がる。

`DEV_ALLOWED_ORIGINS` にブラウザが実際に使うホスト名が無いと、開発サーバはチャンクと HMR の接続を拒む(既定は `localhost,127.0.0.1`)。

## API クライアント

バックエンドの OpenAPI 文書と、そこから生成したクライアントは**どちらもコミットする**。
契約が動いたことが `git diff` に出る。

```bash
docker compose exec app yarn codegen:fetch    # 文書を取り直して型を作り直す
docker compose exec app yarn codegen:verify   # コミット済みの文書から作り直し、差があれば失敗する
```

`codegen:fetch` は稼働中のバックエンドが要る。
`codegen:verify` は何も動いていなくても走るため、CI が回すのはこちら。

## ライセンス

AGPL-3.0-only。著作権者は NewWorldOrg。詳細は `LICENSE` を参照。
