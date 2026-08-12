import type { Meta, StoryObj } from '@storybook/nextjs'

import { SectionHeading } from '@/components/vela/section-heading'
import { Surface, TintPanel } from '@/components/vela/surface'
import { SpotIllustration } from '@/components/vela/spot-illustration'
import { StatusDot } from '@/components/vela/status'
import { MarkRuler, MarkSlashes, MarkType } from '@/components/vela/icons'

const meta = {
  title: 'Foundations/Typography',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function HeadingRow({
  children,
  spec,
  className,
}: {
  children: string
  spec: string
  className: string
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-[9px] not-first:border-t not-first:border-dashed not-first:border-line first:pt-0">
      <span className={className}>{children}</span>
      <span className="font-code text-micro tabular-nums text-ink-3">
        {spec}
      </span>
    </div>
  )
}

export const Scale: Story = {
  render: () => (
    <div className="mx-auto max-w-[760px] p-6">
      <section className="mb-7">
        <SectionHeading mark={MarkType}>見出し階層</SectionHeading>
        <Surface className="flex flex-wrap items-start gap-3.5">
          <div className="min-w-0 flex-1">
            <HeadingRow
              className="heading text-h1"
              spec="Zen Maru 22 / 700 / palt"
            >
              録画ライブラリ
            </HeadingRow>
            <HeadingRow
              className="heading text-h2"
              spec="Zen Maru 18 / 700 / palt"
            >
              地上デジタル
            </HeadingRow>
            <HeadingRow
              className="heading text-h3"
              spec="Zen Maru 16 / 700 / palt"
            >
              チャンネルスキャン
            </HeadingRow>
          </div>
          <SpotIllustration name="tape" className="mt-0.5 size-[70px]" />
        </Surface>
        <p className="mt-[9px] text-note text-ink-3">
          見出しは丸ゴシックの 700 のみ。字間は palt で詰め、行間は 1.45
          まで締める。太さで階層を作らず、サイズで作る。
        </p>
      </section>

      <section className="mb-7">
        <SectionHeading mark={MarkSlashes}>書体の役割分担</SectionHeading>
        <div className="flex flex-col gap-[9px]">
          <TintPanel tint="lavender">
            <div className="mb-0.5 flex items-baseline gap-2 text-cap text-ink-2">
              見出し・ブランド
              <em className="ml-auto font-code text-micro not-italic text-ink-3">
                Zen Maru Gothic 700
              </em>
            </div>
            <div className="heading text-h2">みなと ニュース7</div>
          </TintPanel>
          <TintPanel tint="sage">
            <div className="mb-0.5 flex items-baseline gap-2 text-cap text-ink-2">
              本文・UI
              <em className="ml-auto font-code text-micro not-italic text-ink-3">
                Zen Kaku Gothic New 400 / 500 / 700
              </em>
            </div>
            <div className="text-[14px] font-medium">
              受信状況の切り分けは、まずチューナーの一覧から確認します。
            </div>
          </TintPanel>
          <TintPanel tint="sky">
            <div className="mb-0.5 flex items-baseline gap-2 text-cap text-ink-2">
              数値・型番・時刻
              <em className="ml-auto font-code text-micro not-italic text-ink-3">
                M PLUS 1 Code 400 / 500 · tabular-nums
              </em>
            </div>
            <div className="font-code text-[15px] font-medium tabular-nums">
              31.2
              <u className="ml-0.5 text-micro text-ink-3 no-underline">dB</u> ／
              21:00–22:00 ／ adapter1
              <u className="ml-0.5 text-micro text-ink-3 no-underline">
                /frontend0
              </u>
            </div>
          </TintPanel>
        </div>
      </section>

      <section className="mb-7">
        <SectionHeading mark={MarkRuler}>本文と段落</SectionHeading>
        <Surface>
          <p className="text-body text-ink">
            録画は放送波の TS
            を無劣化のまま保存し、完了後にバックグラウンドでエンコードします。字幕・データ放送を含む全ストリームを保持するため、後からの検証や再エンコードにも対応できます。
          </p>
          <p className="mt-2.5 text-body text-ink">
            エンコード済みファイルの検証が完了するまで、元の TS
            は自動では削除されません。保存先の空き容量が閾値を下回った場合のみ、古い録画から順に整理されます。
          </p>
          <p className="mt-2.5 text-sub text-ink-2">
            既定の保持期間は 30 日です。番組ごとに上書きできます。
          </p>
          <p className="mt-2 text-cap tabular-nums text-ink-3">
            本文 13.5 / 行間 1.8 ・ 補足 12(ink-2)・ 注記 11(ink-3)
          </p>
        </Surface>
      </section>

      <section>
        <SectionHeading mark={MarkRuler}>数値(tabular-nums)</SectionHeading>
        <Surface>
          {[
            ['19:30–19:57', 'くらしの窓口'],
            ['21:00–21:54', 'みなと ニュース7'],
            ['22:00–22:45', '世界の街かど'],
          ].map(([time, title]) => (
            <div
              key={time}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-[9px] not-first:border-t not-first:border-dashed not-first:border-line first:pt-0"
            >
              <span className="w-[104px] shrink-0 font-code text-ui font-medium tabular-nums">
                {time}
              </span>
              <span className="min-w-0 flex-1 truncate text-body font-medium">
                {title}
              </span>
              <span className="font-code text-note whitespace-nowrap tabular-nums text-ink-2">
                みなと総合 011
              </span>
            </div>
          ))}
          <div className="mt-[11px] flex flex-wrap gap-3.5 border-t border-dashed border-line pt-[11px] font-code text-sub tabular-nums text-ink-2">
            <span className="inline-flex items-center gap-1.5">
              <StatusDot tone="ok" />
              CNR 31.2 dB
            </span>
            <span>ドロップ 0</span>
            <span>17.1 Mbps</span>
          </div>
        </Surface>
        <p className="mt-[9px] text-note text-ink-3">
          時刻・ch 番号・CNR は tabular-nums
          で桁を縦に揃える。等幅フォントのブロック使用は行わない。
        </p>
      </section>
    </div>
  ),
}
