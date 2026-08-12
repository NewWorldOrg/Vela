# Vela

録画システムのフロントエンド。デザインシステム(トークン + コンポーネントライブラリ +
Storybook)と、アプリシェル + 主要ルートの骨格が入っている。画面の中身は順次実装する
(認証系の /logged-out・設定 > 認証、予約結果のルートは各ドメインで追加)。

## Tech Stack

- **Framework**: Next.js 16(App Router, RSC)、React 19、TypeScript(strict)
- **Styling**: Tailwind CSS v4(CSS-first `@theme`)、shadcn/ui(`new-york`)
- **Theme**: 独自の light / dark / system(cookie + middleware header + no-flash
  inline script)。`next-themes` は使わない
- **Components**: shadcn primitive(統合 `radix-ui` パッケージ)を土台に、Vela の
  トークンと触感へ寄せたもの + `components/vela/` の固有コンポーネント
- **Table**: `@tanstack/react-table` v8 の汎用 `DataTable`
- **Catalog & verification**: Storybook 10(`@storybook/nextjs`, `addon-a11y`)、
  `@storybook/test-runner`(Playwright)

## Architecture

```
app/                        App Router。globals.css がデザイントークンの実装
app/(app)/                  シェル付きのルート群。(app)/_shell/ がトップバー、
                            (app)/settings/_shell/ が管理サイドナビ(いずれも Client)
app/_components/            components/ に置くほど汎用でない、app/ 配下専用の部品
components/ui/*             shadcn primitive(Vela の見た目に寄せてある)
components/vela/*           Vela 固有のコンポーネント・独自 SVG アイコン
components/theme/*          light/dark/system テーマ
components/common/*         汎用 DataTable
page-component/{screen}/    画面本体。app/ の RSC から props で受け、Client 境界は必要な葉だけ
feature/{domain}/           画面間で共有する機能部品(チップ・ダイアログ等)
repository/                 データ取得と唯一の型境界(現状フィクスチャ)
lib/                        cn・パス判定・表示整形などの純関数
hooks/                      useListUrlState / usePerPageLocalStorage
types/                      DataTable の型
stories/{foundations,components,screens,common,theme}/
```

画面を作るときの層構造は `app/`(Server Component でデータ取得)→
`page-component/` → `feature/` → `common/` → `repository/` → `client/`。
`repository/` を唯一の型境界にし、URL を状態の source とする。
useEffect でのデータ取得・初期値同期は禁止。

**Naming / conventions**

- import alias: `@/*` はリポジトリルート
- Prettier: single quote / semicolon なし。`shadcn add` の後は必ず `yarn prettier`
- primitive は統合 `radix-ui` パッケージから import する
- コンポーネントを変更したら Story も同時に更新する

## Design System

正典は「小さなデジタル玩具」。実装上の不変条件:

- **枠と影を与えるのは「押せるもの・浮いているもの」だけ**。ただの情報のまとまりは
  `Surface` / `TintPanel`(線も影もなし)、押せるものは `Tile` / `Button`
- **影はぼかさない**。`shadow-pop`(2px)→ hover `shadow-pop-lg`(3px)+1px 持ち上げ
  → active `shadow-pop-none` + 1px 沈み。浮いているものは `shadow-pop-xl`(4px)
- **主要ボタンは pill**。四角い塗りボタンを作らない
- **塗りボタンは `bg-btn-fill` / `text-on-btn`**。`--accent` を直接 background に
  しない(ダークは淡い青緑の塗り + 濃い文字に切り替わる)
- **区画は線ではなく tint の色面で分ける**。文字は常に `text-ink`、彩度を上げない。
  1 画面で使う tint は 3〜4 色まで
- **アイコンは `components/vela/icons.tsx` に描く**。汎用アイコンセットで置き換え
  ない。24x24 / stroke 1.6 / round cap / fill none
- **常時ループするアニメーション禁止**(点滅・パルス・回転)。例外は `Spinner` のみ
- **文言は変えない**。デザイン都合で用語をやわらかく言い換えない
- 禁止: グラデーション背景 / blur 影 / 等幅フォントのブロック使用 / 高彩度の大面積
  塗り / 純黒・純白の大面積 / 絵文字アイコン / 意味のない装飾図形

## CI Commands

すべて Docker の `app` サービス内で実行する。

```bash
docker compose exec app yarn lint             # eslint + prettier:check
docker compose exec app yarn typecheck        # tsc --noEmit
docker compose exec app yarn build            # next build
docker compose exec app yarn build-storybook  # 静的 Storybook
task test:stories                             # build + test-runner(a11y 含む)
```

GitHub Actions は push / PR(master)で lint + typecheck + build を実行する。

## Docker Config

- compose サービス: `app`(`node:25.2-slim`, `working_dir: /code`, リポジトリを
  `/code` にマウント)
- dev サーバ: `8080 -> 3000` / Storybook: `6006`
- `task` ショートカット: `task up` `task dev` `task storybook` `task lint`
  `task typecheck` `task test:stories`

## UI Hostname

- 開発サーバ: http://localhost:8080
- Storybook: http://localhost:6006

## Implementation Phases

0. デザインシステム — トークン、コンポーネントライブラリ、Storybook
1. **画面(現在地)** — サービス系(番組表 / ライブ / ライブラリ / 予約)は トップナビ、
   管理系(チューナー / チャンネル / エンコード / 品質 / システム)は「設定」配下の
   サイドナビ
2. API 連携 — OpenAPI スキーマからクライアントを生成し、`repository/` に閉じる
