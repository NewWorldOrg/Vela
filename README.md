# Vela

日本のテレビ放送を録画するシステムの Web フロントエンドです。\
番組表の予約、ライブと録画の視聴、ライブラリの管理をブラウザで行います。\
録画と配信の API は [Carina](https://github.com/NewWorldOrg/Carina) が受け持ち、Vela は Next.js のサーバとして Carina の API から取得したデータで画面を描画します。

本番で動かすときは、Carina と一緒に構成した [Pyxis](https://github.com/NewWorldOrg/Pyxis) を使ってください。

## 動かす

イメージは `ghcr.io/newworldorg/vela` にあり、`v1.1.0` のようなバージョンのタグと `latest` が使えます。\
コンテナは 3000 番ポートで待ち受け、uid 1001 で動きます。

```bash
docker run -d -p 3000:3000 -e CARINA_API_BASE_URL=http://carina:8080 ghcr.io/newworldorg/vela:v1.1.0
```

リバースプロキシを置き、同じオリジンで `/api/*` を Carina に、それ以外を Vela に振り分けます。\
WebSocket(`/api/live/ws`)と SSE(`/api/events`)はバッファせずに流し、`Range` ヘッダはそのまま通してください。

## 設定

| 変数 | 内容 |
| --- | --- |
| `CARINA_API_BASE_URL` | Carina の API のアドレス。必須です |
| `DEV_ALLOWED_ORIGINS` | 開発サーバが受け付けるホスト名。カンマ区切りで、既定は `localhost,127.0.0.1` |

## 開発

Docker があれば動きます。Carina が無くても画面は起動します。

```bash
task up      # 開発コンテナ
task yarn    # 依存の取得
task dev     # http://localhost:8080
```

Storybook は `task storybook` で起動し、http://localhost:6006 で開きます。\
ビルド、テスト、lint のコマンドは `CLAUDE.md` にあります。

Carina の OpenAPI ドキュメントと、そこから生成した API クライアントはコミットしています。\
API が変わったら `yarn codegen:fetch` で作り直してください(Carina が起動している必要があります)。\
データ放送のランタイムも生成物をコミットしており、`lib/bml/` や `lib/hybridcast/` を変えたら `yarn bml-runtime` で作り直します。

## ライセンス

AGPL-3.0-only です。著作権者は NewWorldOrg で、全文は `LICENSE` にあります。\
イメージに同梱したソフトウェアのライセンスは `THIRD-PARTY-NOTICES.md` と、イメージ内の `/usr/share/doc/vela/` にあります。
