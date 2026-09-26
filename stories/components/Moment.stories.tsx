import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, within } from 'storybook/test'

import { formatMoment, formatMomentSpan, SPAN_DASH } from '@/lib/format'
import { WHEN_LABELS, WHEN_MARKS } from '@/lib/when-terms'
import { SectionHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'
import { MarkAxis, MarkRuler } from '@/components/vela/icons'

const RECORDED_FROM = '2026-09-15T11:55:00Z'
const RECORDED_UNTIL = '2026-09-15T13:00:00Z'
const BROADCAST_FROM = '2026-09-18T06:00:00Z'
const BROADCAST_UNTIL = '2026-09-18T06:07:00Z'
const TAKEN = '2026-09-18T06:07:12Z'
const ANOTHER_YEAR = '2027-01-01T15:10:00Z'

const HEADINGS: [string, string][] = [
  [WHEN_LABELS.recorded, formatMoment(RECORDED_FROM)],
  [WHEN_LABELS.broadcast, formatMomentSpan(BROADCAST_FROM, BROADCAST_UNTIL)],
  [WHEN_LABELS.taken, formatMoment(TAKEN)],
]

const PLACES: [string, string][] = [
  ['ライブラリ一覧', formatMoment(RECORDED_FROM)],
  ['予約一覧', formatMomentSpan(BROADCAST_FROM, BROADCAST_UNTIL)],
  ['失敗台帳・エンコード', formatMoment(TAKEN)],
  ['録画詳細', formatMomentSpan(RECORDED_FROM, RECORDED_UNTIL)],
]

const EDGES: [string, string][] = [
  ['当年は年を書かない', formatMoment(RECORDED_FROM)],
  ['当年でなければ年を書く', formatMoment(ANOTHER_YEAR)],
  [
    '日付を跨ぐ範囲は向こう側も日付から',
    formatMomentSpan('2026-09-18T14:50:00Z', '2026-09-18T15:10:00Z'),
  ],
  ['サイズの副行', `${WHEN_MARKS.taken} ${formatMoment(TAKEN)}`],
]

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-[minmax(0,13rem)_minmax(0,1fr)] gap-x-4 gap-y-2 text-ui">
      {rows.map(([name, said]) => (
        <div key={name} className="contents">
          <dt className="text-sub text-ink-3">{name}</dt>
          <dd className="font-code tabular-nums">{said}</dd>
        </div>
      ))}
    </dl>
  )
}

const meta = {
  title: 'Components/Moment',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const ひとつの語とひとつの形: Story = {
  render: () => (
    <div className="mx-auto max-w-[680px] p-6">
      <SectionHeading mark={MarkRuler}>日時の見出し語</SectionHeading>
      <Surface className="mb-5">
        <Rows rows={HEADINGS} />
      </Surface>
      <SectionHeading mark={MarkAxis}>同じ形で書く 4 か所</SectionHeading>
      <Surface className="mb-5">
        <Rows rows={PLACES} />
      </Surface>
      <SectionHeading mark={MarkRuler}>端</SectionHeading>
      <Surface>
        <Rows rows={EDGES} />
      </Surface>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    for (const [, said] of PLACES) {
      await expect(canvas.getAllByText(said).length).toBeGreaterThan(0)
    }

    for (const [, said] of [...PLACES, ...HEADINGS]) {
      if (said.includes(SPAN_DASH)) {
        await expect(said.split(SPAN_DASH)).toHaveLength(2)
      }
    }
  },
}
