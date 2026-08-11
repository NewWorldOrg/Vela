import type { Meta, StoryObj } from '@storybook/nextjs'

import { SectionHeading } from '@/components/vela/section-heading'
import {
  Surface,
  Tile,
  TileMeta,
  TileTitle,
  TintPanel,
} from '@/components/vela/surface'
import { MarkPanel, MarkPill } from '@/components/vela/icons'

const meta = {
  title: 'Foundations/Elevation',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const RULES: [string, string][] = [
  [
    '単なる情報のまとまり',
    '枠なし。surface の面を敷き、余白と小見出しで区切る',
  ],
  [
    '押せるもの(ボタン・行・タイル)',
    '1px 線 + hard offset shadow + 触感 motion',
  ],
  ['浮いているもの(モーダル・パネル)', '1px 線 + 大きめの hard shadow(4px)'],
  ['一覧・テーブル', '外枠で囲わない。ヘッダ行を surface-2、行間は破線区切り'],
]

export const SurfacesAndShadows: Story = {
  render: () => (
    <div className="mx-auto max-w-[760px] p-6">
      <section className="mb-7">
        <SectionHeading mark={MarkPanel}>面の使い分け</SectionHeading>
        <Surface className="mb-2.5">
          <h3 className="heading mb-0.5 text-ui">枠で囲わない情報のまとまり</h3>
          <p className="text-sub text-ink-2">
            ただの情報は面を敷くだけ。線も影も与えない。
          </p>
        </Surface>
        <div className="mb-2.5 flex flex-wrap gap-2.5">
          <Tile>
            <TileTitle>チューナー</TileTitle>
            <TileMeta>4 台 / 3 台 稼働</TileMeta>
          </Tile>
          <Tile>
            <TileTitle>今日の予約</TileTitle>
            <TileMeta>6 件</TileMeta>
          </Tile>
        </div>
        <TintPanel tint="butter">
          <p className="text-sub text-ink-2">
            パステルの面。区画を分けるためだけの面なので、線も影も持たない。
          </p>
        </TintPanel>
        <p className="mt-[9px] text-note text-ink-3">
          線と影を与えるのは押せるものだけ。これが Card 乱用を避ける唯一の基準。
        </p>
      </section>

      <section className="mb-7">
        <SectionHeading mark={MarkPill}>hard offset shadow</SectionHeading>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4">
          {[
            ['shadow-pop', '2px 2px 0', '既定'],
            ['shadow-pop-lg', '3px 3px 0', 'hover(+1px 持ち上げ)'],
            ['shadow-pop-none', '0 0 0', 'active(1px 沈み)'],
            ['shadow-pop-xl', '4px 4px 0', '浮いているもの'],
          ].map(([token, value, role]) => (
            <div key={token}>
              <div
                className={`h-[52px] rounded-lg border border-line-strong bg-surface ${token}`}
                aria-hidden="true"
              />
              <p className="mt-2 font-code text-micro text-ink-2">{token}</p>
              <p className="font-code text-micro text-ink-3">{value}</p>
              <p className="text-cap text-ink-3">{role}</p>
            </div>
          ))}
        </div>
        <p className="mt-[9px] text-note text-ink-3">
          影はぼかさない。押せるものは影を落とさず「ずらす」ことで浮きを表す。
        </p>
      </section>

      <section>
        <SectionHeading mark={MarkPanel}>使い分けの表</SectionHeading>
        <Surface>
          {RULES.map(([use, how]) => (
            <div
              key={use}
              className="flex flex-wrap gap-x-3 gap-y-0.5 py-2.5 not-first:border-t not-first:border-dashed not-first:border-line first:pt-0"
            >
              <span className="w-[220px] shrink-0 text-ui font-medium">
                {use}
              </span>
              <span className="min-w-0 flex-1 text-sub text-ink-2">{how}</span>
            </div>
          ))}
        </Surface>
      </section>
    </div>
  ),
}
