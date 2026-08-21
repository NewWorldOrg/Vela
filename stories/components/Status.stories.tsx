import type { Meta, StoryObj } from '@storybook/nextjs'

import { Badge } from '@/components/ui/badge'
import { SectionHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'
import { ChipDot, StatusDot, StatusText } from '@/components/vela/status'
import { MarkDots, MarkPill, SignalIcon } from '@/components/vela/icons'

const meta = {
  title: 'Components/Status',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const BASE: [string, string, string, string][] = [
  ['ok', '正常', '受信・録画が期待どおりに動作している', 'mint'],
  ['warn', '警告', '動作は継続しているが品質・条件が低下している', 'lemon'],
  ['err', '異常', '受信不能・録画失敗など、対応が必要', 'coral'],
  ['off', '停止', '無効化済みの状態。エラーではない', 'ink-3'],
]

export const DotAndText: Story = {
  render: () => (
    <div className="mx-auto max-w-[620px] p-6">
      <SectionHeading mark={MarkDots}>ドット+テキスト(基本形)</SectionHeading>
      <Surface className="py-0.5">
        {BASE.map(([tone, label, desc, token]) => (
          <div
            key={tone}
            className="flex flex-wrap items-center gap-x-[11px] gap-y-1 border-b border-dashed border-line py-[11px] last:border-b-0"
          >
            <StatusDot tone={tone as 'ok' | 'warn' | 'err' | 'off'} />
            <b className="heading w-[3.4em] shrink-0 text-ui">{label}</b>
            <span className="min-w-0 flex-1 text-sub text-ink-2">{desc}</span>
            <span className="shrink-0 rounded-full bg-surface-2 px-2.5 font-code text-micro text-ink-3">
              {token}
            </span>
          </div>
        ))}
      </Surface>
      <p className="mt-[9px] text-note text-ink-3">
        重要な状態も点滅させず、静的な色+形で示す。ドット径 7px。
      </p>
    </div>
  ),
}

export const Chips: Story = {
  render: () => (
    <div className="mx-auto max-w-[620px] p-6">
      <SectionHeading mark={MarkPill}>チップ型バッジ</SectionHeading>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="selected">選択中</Badge>
        <Badge variant="info">予約済み</Badge>
        <Badge variant="recording">
          <ChipDot />
          録画中
        </Badge>
        <Badge variant="warn">drain 中</Badge>
        <Badge variant="warn">要確認</Badge>
        <Badge variant="warn">要再検証</Badge>
        <Badge variant="err">受信不可</Badge>
        <Badge variant="ok">受信可</Badge>
        <Badge variant="sky">BasicOnly</Badge>
        <Badge>ワンセグ</Badge>
        <Badge variant="mute">未計測</Badge>
      </div>
      <p className="mt-[9px] text-note text-ink-3">
        ドットを伴うのは録画中のみ。同系色のチップは文言で区別し、色数を増やさない。
      </p>

      <SectionHeading mark={SignalIcon} className="mt-7">
        区分チップ(TV / ワンセグ / データ)
      </SectionHeading>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="kindTv">TV</Badge>
        <Badge variant="kindSegment">ワンセグ</Badge>
        <Badge variant="kindData">データ</Badge>
      </div>
      <p className="mt-[9px] text-note text-ink-3">
        区分は状態ではないため、文字は ink-2
        のまま。彩度を抑えた面色の差だけで識別する。
      </p>
    </div>
  ),
}

export const InUse: Story = {
  render: () => (
    <div className="mx-auto max-w-[620px] p-6">
      <SectionHeading mark={MarkDots}>適用例</SectionHeading>
      <p className="mb-0.5 text-sub text-ink-2">
        一覧の行ではドット+テキストを基本にし、チップは補助情報に限る。
      </p>
      <Surface className="py-0.5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-dashed border-line py-3 text-ui">
          <span className="font-code tabular-nums">PX-Q3U4 #1</span>
          <StatusText tone="ok">受信中</StatusText>
          <Badge variant="recording">
            <ChipDot />
            録画中
          </Badge>
          <span className="ml-auto font-code text-sub whitespace-nowrap tabular-nums text-ink-2">
            CNR 32.4 dB
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 py-3 text-ui">
          <span className="font-medium">
            <span className="font-code tabular-nums">011</span> みなと総合1
          </span>
          <Badge variant="kindTv">TV</Badge>
          <Badge variant="info">予約済み</Badge>
        </div>
      </Surface>
      <p className="mt-[9px] text-note text-ink-3">
        チップは 11.5px / 999px 角丸。soft 面上の文字はコントラスト 4.5:1
        以上を維持する。
      </p>
    </div>
  ),
}
