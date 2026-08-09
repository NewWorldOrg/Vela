# Vela

録画システムのフロントエンド。Next.js の App Router + Storybook で、デザイン
システム(トークンとコンポーネント)を実装したリポジトリです。

現時点のスコープはデザインシステムまで。画面の実装はまだ入っていません。

## デザインの方針

UI 全体をひとつの「小さなデジタル玩具」として設計します。

- **触れる感触があること** — hover で 1px 持ち上がって影が伸び、押すと沈んで影が
  消える。ぼかさない hard offset shadow だけを使う
- **Card を乱用しない** — 枠と影を与えるのは「押せるもの・浮いているもの」だけ。
  ただの情報のまとまりは、余白と背景サーフェスの差で階層を作る
- **区画は線ではなく淡い色面(tint)で分ける** — 文字は常に墨、彩度は上げない
- **独自 SVG アイコン** — 汎用アイコンセットは使わない。24x24 / stroke 1.6 /
  round cap で、わずかに崩して手描きの気配を残す
- **常時ループするアニメーションを作らない** — 動くのは「触れた時」と読み込み中の
  スピナーだけ
- ライト既定 + ダーク完備。shadcn/ui のアクセシブルな primitive と interaction は
  使うが、その SaaS 的なビジュアルランゲージには寄せない

## 技術構成

- **Next.js 16**(App Router, RSC)+ **React 19** + **TypeScript**(strict)
- **Tailwind CSS v4**(CSS-first `@theme`)+ **shadcn/ui**(`new-york`)
- 独自の **light / dark / system テーマ**(cookie + middleware + no-flash script。
  `next-themes` は使わない)
- **Storybook 10** + `@storybook/test-runner`(Playwright)+ `addon-a11y`

## 開始する

すべて Docker の `app` サービス(Node, `working_dir: /code`)の中で実行します。

```bash
docker compose up -d                      # task up
docker compose exec app yarn install
docker compose exec app yarn storybook    # task storybook — :6006
docker compose exec app yarn dev          # task dev — :8080
```

### よく使うコマンド

```bash
docker compose exec app yarn lint            # eslint + prettier:check  (task lint)
docker compose exec app yarn typecheck       # tsc --noEmit             (task typecheck)
docker compose exec app yarn build           # next build
docker compose exec app yarn build-storybook # 静的 Storybook
task test:stories                            # build + Storybook test-runner(a11y 含む)
```

## デザイントークン

トークンは `app/globals.css` に Tailwind v4 のテーマ変数として実装しています。
ライトは `:root`、ダークは `.dark` に同名で定義され、ユーティリティ側は
テーマを意識しません。

| 種別 | トークン | ユーティリティ例 |
| --- | --- | --- |
| 地・面 | `--bg` `--surface` `--surface-2` `--surface-3` | `bg-bg` `bg-surface` `bg-surface-2` |
| 線 | `--line` `--line-strong` | `border-line` `border-line-strong` |
| 墨 | `--ink` `--ink-2` `--ink-3` | `text-ink` `text-ink-2` `text-ink-3` |
| 主役 | `--accent` `--accent-soft` `--accent-line` | `text-brand` `bg-brand-soft` `border-brand-line` |
| 塗りボタン | `--btn-fill` `--on-btn` | `bg-btn-fill` `text-on-btn` |
| パステルの面 | `--tint-lavender` ほか 6 色 | `bg-tint-lavender` … |
| セマンティクス | `mint` / `lemon` / `coral` / `sky` と `-soft` `-line` | `text-mint` `bg-lemon-soft` |
| 角丸 | `--r-s` 10 / `--r-m` 16 / `--r-l` 22 / pill | `rounded-md` `rounded-lg` `rounded-xl` `rounded-full` |
| 影 | hard offset のみ | `shadow-pop` `shadow-pop-lg` `shadow-pop-xl` `shadow-pop-none` |
| 触感 | `--ease` / `--dur` | `ease-toy` `duration-150` |

書体は見出し・ブランドが **Zen Maru Gothic**(700 / `palt`)、本文と UI が
**Zen Kaku Gothic New**、数値・型番・時刻が **M PLUS 1 Code**(`tabular-nums`)。
`font-heading` / `font-body` / `font-code` と、`text-h1` … `text-micro` の
サイズスケールで指定します。

塗りボタンは `--accent` ではなく `--btn-fill` / `--on-btn` を使ってください。
ライトは濃い青緑の塗り、ダークは淡い青緑の塗り+濃い文字に切り替わります。

## ディレクトリ

```
app/                     App Router。globals.css がトークンの実装
components/ui/*          shadcn primitive(Vela の見た目に寄せてある)
components/vela/*        Vela 固有のコンポーネントと独自アイコン
components/theme/*       light/dark/system テーマの仕組み
components/common/*      汎用 DataTable
hooks/                   useListUrlState / usePerPageLocalStorage
types/                   DataTable の型
stories/foundations/*    トークンの見本(色・書体・面と影・アイコン)
stories/components/*     Vela コンポーネントの story
stories/ui/*             未改変の primitive の story
```

`@/*` はリポジトリルートを指します(`@/components/ui/button` など)。

## コンポーネントを足す

```bash
docker compose exec app sh -c "npx shadcn@latest add <name>"
docker compose exec app yarn prettier   # 生成物は double-quote/semi なので整形する
```

生成された primitive は shadcn 既定の見た目のままなので、Vela のトークンと触感に
寄せてから使ってください。追加したら必ず `stories/` に story を書き、バリアントと
状態(hover / disabled / エラー / 空)を並べます。

## 検証

`task test:stories` が実ブラウザで全 story を描画し、各 story の `play` と a11y
チェックを走らせます。a11y は違反があれば失敗する設定です。
