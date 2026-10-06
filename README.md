# Vela

Vela は、日本の地上デジタル放送向けの録画システムのフロントエンドである。
番組表を見て予約し、録画済みの番組を検索して再生するまでをブラウザで行う。
録画そのものは、バックエンドの [Carina](https://github.com/NewWorldOrg/Carina) が担当する。

## 構成

Vela は Next.js(App Router)で動くサーバである。
画面は、サーバ側で Carina の API から取得したデータで描く(接続先は `CARINA_API_BASE_URL`)。
イベント・局のロゴ・再生・ライブのように、ブラウザが直接出す要求は、`/api/*` として前段のプロキシから Carina に届く。
ディレクトリの構成、ビルドと試験のコマンド、コードの決まり、デザインシステムは `CLAUDE.md` にある。

## 必要なもの

必要なのは Docker だけである。
バックエンドが動いていなくても、画面は立ち上がる。

## セットアップ

```bash
task up      # 開発コンテナ
task yarn    # 依存の取得
task dev     # http://localhost:8080
```

Task を使わない場合は次のとおり。

```bash
docker compose up -d
docker compose exec app yarn install
docker compose exec app yarn dev
```

開発サーバはコンテナの 3000 番で待ち受け、ホストの 8080 番に公開する。
Storybook は `task storybook` で起動し、http://localhost:6006 で開ける。

## 配置

前段にリバースプロキシを置き、同じオリジンのまま `/api/*` を Carina に、それ以外を Vela に振り分ける。
Vela は `/api/*` を中継しない。

- WebSocket(`/api/live/ws`)と SSE(`/api/events`)は、切らずにバッファせず流す
- `Range` ヘッダはそのまま通す(録画の再生とシークに使う)

開発サーバを直接開いた場合、ブラウザが `/api/*` に出す要求は Carina に届かない。

## イメージ

`master` にマージされるたびに、CI が `ghcr.io/newworldorg/vela` に `sha-<commit>` のタグで公開する。
`<commit>` は、そのコミットのハッシュの先頭 12 桁である。
対応する CPU は amd64 だけである。
一度公開したタグの中身は変わらない。

イメージは 3000 番で待ち受け、uid 1001 で動く。
起動するときに `CARINA_API_BASE_URL` を指定する。

## 設定

| 変数 | 用途 |
| --- | --- |
| `CARINA_API_BASE_URL` | バックエンド(Carina)の接続先 |
| `DEV_ALLOWED_ORIGINS` | 開発サーバが受け付けるホスト名。カンマで区切り、ポートは含めない |

`CARINA_API_BASE_URL` には、コード側の既定値が無い。
未設定のまま API を呼ぶ要求が来ると、その要求は失敗する。
開発では compose が値を渡すので、指定しなくても立ち上がる。

`DEV_ALLOWED_ORIGINS` の既定は `localhost,127.0.0.1` である。
ブラウザが実際に使うホスト名が含まれていないと、開発サーバはチャンクと HMR の接続を拒む。

## API クライアント

バックエンドの OpenAPI 文書と、そこから生成したクライアントは、**どちらもコミットする**。
そのため、API の契約が変わると `git diff` に表れる。

```bash
docker compose exec app yarn codegen:fetch    # 文書を取り直して型を作り直す
docker compose exec app yarn codegen:verify   # コミット済みの文書から作り直し、差があれば失敗する
```

`codegen:fetch` には、動いているバックエンドが要る。
`codegen:verify` は何も動いていなくても実行できるので、CI ではこちらを実行する。

## ライセンス

ライセンスは AGPL-3.0-only で、著作権者は NewWorldOrg である。
詳細は `LICENSE` にある。

イメージに同梱した他のソフトウェアとそのライセンスは、`THIRD-PARTY-NOTICES.md` に載せている。
イメージの中では、`LICENSE`・`THIRD-PARTY-NOTICES.md`・同梱物のライセンス全文が `/usr/share/doc/vela/` にある。
