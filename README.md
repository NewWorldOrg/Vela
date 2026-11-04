# Vela

Vela は、日本のテレビ放送を録画して観るシステムの画面。\
録画・ライブ・番組表の API は [Carina](https://github.com/NewWorldOrg/Carina) が持ち、Vela はそれをブラウザで使う形にする。

ブラウザでできること。

- 番組表を見て予約する。キーワード・局・曜日・ジャンルの条件で自動で予約するルールを作る
- ライブを観る。録画を再生し、字幕とデータ放送を出す
- 録画を探す。シリーズごとにまとめて見る。続きから再生する
- 録画のエンコードと CM・OP・ED の検出の状態を見る
- チューナー・チャンネル・認証・画質の設定を変える

PC のブラウザ・iPad・スマートフォンで使う。

## 動かす

本番で動かすなら、Carina と一緒に立てる [Pyxis](https://github.com/NewWorldOrg/Pyxis) を使う。\
compose と Helm チャートがあり、前段のプロキシも入っている。

イメージは `ghcr.io/newworldorg/vela`。
3000 番で待ち受け、uid 1001 で動く。
起動するときに `CARINA_API_BASE_URL` で Carina の場所を渡す。

Vela と Carina は同じオリジンに置き、前段のプロキシが `/api/*` を Carina に、それ以外を Vela に送る。\
Vela は `/api/*` を中継しない。\
ブラウザが直接出す要求(イベント・局のロゴ・再生・ライブ)がプロキシ越しに Carina へ届く形になるので、前段には次を持たせる。

- `/api/live/ws` の WebSocket と `/api/events` の SSE を、切らずに溜めずに流す
- `Range` ヘッダをそのまま通す。録画の再生とシークに使う

## 設定

| 変数 | 用途 |
| --- | --- |
| `CARINA_API_BASE_URL` | Carina の接続先。既定値は無く、未設定のまま API を呼ぶ要求は失敗する |
| `DEV_ALLOWED_ORIGINS` | 開発サーバが受け付けるホスト名。カンマで区切り、ポートは含めない。既定は `localhost,127.0.0.1` |

`DEV_ALLOWED_ORIGINS` にブラウザが実際に使うホスト名が無いと、開発サーバはチャンクと HMR の接続を拒む。

## イメージのタグ

`master` にマージされるたびに、CI が `ghcr.io/newworldorg/vela` に `sha-<commit>` のタグで公開する。\
`<commit>` はそのコミットのハッシュの先頭 12 桁。\
`v0.1.0` のようなバージョンのタグを push すると、CI はイメージを作り直さず、そのコミットの `sha-<commit>` に `v0.1.0` のタグを足す。\
`latest` は、prerelease(`v0.2.0-rc.1` のように `-` を含むもの)を除いた最も新しいバージョンと同じイメージを指す。\
prerelease のタグを push したときは、そのバージョンのタグだけが足される。\
`latest` を除き、一度公開したタグの中身は変わらない。\
対応する CPU は amd64 だけ。

## 開発

必要なのは Docker だけ。\
Carina が動いていなくても画面は立ち上がる。

```bash
task up      # 開発コンテナ
task yarn    # 依存の取得
task dev     # http://localhost:8080
```

Task を使わないなら次のとおり。

```bash
docker compose up -d
docker compose exec app yarn install
docker compose exec app yarn dev
```

開発サーバはコンテナの 3000 番で待ち受け、ホストの 8080 番に公開する。\
開発サーバを直接開くと、ブラウザが `/api/*` に出す要求は Carina に届かない。\
Storybook は `task storybook` で起動し、http://localhost:6006 で開ける。\
ディレクトリの構成、ビルドと試験のコマンド、コードの決まりは `CLAUDE.md` にある。

### API クライアント

Carina の OpenAPI 文書と、そこから生成したクライアントは、どちらもコミットしてある。\
API の契約が変わると `git diff` に表れる。

```bash
docker compose exec app yarn codegen:fetch    # 文書を取り直して型を作り直す
docker compose exec app yarn codegen:verify   # コミット済みの文書から作り直し、差があれば失敗する
```

`codegen:fetch` には動いている Carina が要る。\
`codegen:verify` は何も動いていなくても実行できるので、CI ではこちらを実行する。

### データ放送のランタイム

データ放送の文書は、別オリジンの枠の中で 1 本のスクリプトが描く。\
そのスクリプトは `lib/bml/` と `components/data-broadcast/` から組み、`components/data-broadcast/runtime-script.generated.ts` としてコミットしてある。\
Hybridcast のアプリの文書に渡す受信機のスクリプトも同じ手順で `lib/hybridcast/` から組み、`public/data-broadcast/hybridcast-receiver.js` としてコミットしてある。\
Carina の中継がアプリの文書にこのパスのスクリプトを差し込む。\
どれかを変えたら組み直す。\
組み直していないと単体試験が落ちる。

```bash
docker compose exec app yarn bml-runtime   # ランタイムと受信機のスクリプトを組み直す
```

データ放送の面と番組名の放送マークは `public/fonts/denpa-font.woff2`(Denpa Font)で描く。\
`sh scripts/fetch-denpa-font.sh` が版を固定して取り直し、sha256 を確かめる。

## ライセンス

AGPL-3.0-only。著作権者は NewWorldOrg で、全文は `LICENSE` にある。

イメージに同梱した他のソフトウェアとそのライセンスは `THIRD-PARTY-NOTICES.md` に載せている。\
イメージの中では、`LICENSE`・`THIRD-PARTY-NOTICES.md`・同梱物のライセンス全文が `/usr/share/doc/vela/` にある。
