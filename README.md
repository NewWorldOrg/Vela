# Vela

日本の地上デジタル放送向けの録画システムのフロントエンド。
番組表を見て予約し、録画済みの番組を検索して再生するところまでをブラウザで行う。
録画そのものはバックエンドの [Carina](https://github.com/NewWorldOrg/Carina) が担当する。

## 構成

Next.js の App Router。
画面はサーバコンポーネントが取得し、クライアントへ渡す。
**URL がそのまま状態**で、絞り込み・ページ・並び順はすべて URL に載る。

```
app/                画面。ルーティングと、取得を行うサーバコンポーネント
components/{領域}/  その領域の画面と、画面を組む部品
components/vela/    このプロジェクト固有の部品とアイコン
components/ui/      素の UI 部品
repository/         データ取得。API と話すのはここだけ
repository/client/  OpenAPI 文書と、そこから生成したクライアント
lib/                React に依らない純粋な関数
hooks/              画面をまたいで使うフック
stories/            Storybook
tests/              テスト。lib と repository は対象のパスをそのまま写す
scripts/            生成物の検証、疎通確認
```

画面は `app/` → `components/{領域}/` → `repository/` → `repository/client/` の順に重なる。
**API と話すのは `repository/` だけ**で、その外から生成クライアントを import することは eslint が禁じている。

バックエンドの OpenAPI 文書と、そこから生成したクライアントは**どちらもコミットする**。
契約が動いたことが `git diff` に出る。

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

開発サーバを直接開くと、ブラウザが `/api/*` に出す要求(イベント・局のロゴ・再生・ライブ)は届かない。

## イメージ

`master` に入るたびに、CI が `ghcr.io/newworldorg/vela` へ `sha-<commit>` のタグで出す。
`<commit>` はそのコミットの先頭 12 桁で、対応する CPU は amd64 だけ。
一度出したタグの中身は変わらない。

## 設定

| 変数 | 用途 |
| --- | --- |
| `CARINA_API_BASE_URL` | バックエンドの接続先 |
| `DEV_ALLOWED_ORIGINS` | 開発サーバが受け付けるホスト名。カンマ区切り、ポートは含めない |

`CARINA_API_BASE_URL` にコード側の既定値は無く、未設定のまま API へ届く要求が来ると失敗する。
開発では compose が渡すので、書かなくても立ち上がる。

`DEV_ALLOWED_ORIGINS` にブラウザが実際に使うホスト名が無いと、
開発サーバはチャンクと HMR の接続を拒む(既定は `localhost,127.0.0.1`)。

## API クライアント

```bash
docker compose exec app yarn codegen:fetch    # 文書を取り直して型を作り直す
docker compose exec app yarn codegen:verify   # コミット済みの文書から作り直し、差があれば失敗する
```

`codegen:fetch` は稼働中のバックエンドが要る。
`codegen:verify` は何も動いていなくても走るため、CI が回すのはこちら。

## 開発

```bash
task lint          # eslint + prettier --check
task typecheck     # tsc --noEmit
task test          # 単体テスト
task test:stories  # 全 story を実ブラウザで light と dark の両方で描画し、a11y も見る
```

コーディング規約とデザインシステムは `CLAUDE.md` にある。

## ライセンス

AGPL-3.0-only。著作権者は NewWorldOrg。詳細は `LICENSE` を参照。
