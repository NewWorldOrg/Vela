import type { Meta, StoryObj } from '@storybook/nextjs'

import { ProgressBar, SignalMeter, Spinner } from '@/components/vela/progress'
import { SectionHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'
import { Button } from '@/components/ui/button'
import { EncodeIcon, SearchIcon, TunerIcon } from '@/components/vela/icons'

const meta = {
  title: 'Components/Progress',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const ScanProgress: Story = {
  render: () => (
    <div className="mx-auto max-w-[620px] p-6">
      <SectionHeading mark={SearchIcon}>スキャン進捗</SectionHeading>
      <Surface>
        <div className="mb-[13px] flex items-start justify-between gap-3">
          <div>
            <h3 className="heading text-[13.5px] leading-[1.5]">
              チャンネルスキャン
            </h3>
            <p className="text-sub text-ink-2">
              地上デジタル 全50ch を走査しています
            </p>
          </div>
          <Button variant="outline" size="sm">
            キャンセル
          </Button>
        </div>
        <ProgressBar value={68} label="チャンネルスキャンの進捗" />
        <div className="mt-[9px] flex items-baseline justify-between font-code text-sub tabular-nums text-ink-3">
          <span>
            <b className="text-ui font-medium text-ink">34 / 50ch</b>
            <span className="mx-1.5">・</span>経過 04:12
          </span>
          <span className="text-ink-2">68%</span>
        </div>
      </Surface>
    </div>
  ),
}

export const Meters: Story = {
  render: () => (
    <div className="mx-auto max-w-[620px] p-6">
      <SectionHeading mark={TunerIcon}>信号品質メーター(CNR)</SectionHeading>
      <Surface className="flex flex-col gap-3.5">
        <SignalMeter
          channel="みなと総合1(27ch)"
          value="31.2 dB"
          status="良好"
          percent={78}
          tone="ok"
        />
        <SignalMeter
          channel="湾岸 BS1(BS15)"
          value="22.4 dB"
          status="低下"
          percent={56}
          tone="warn"
        />
        <SignalMeter
          channel="CS110 ND02"
          value="8.2 dB"
          status="受信不可"
          percent={20}
          tone="err"
        />
      </Surface>
      <p className="mt-[9px] text-note text-ink-3">
        バーは高さ 4px・単色塗りのみ。CNR は 0–40 dB
        を幅に対応させ、値は必ずテキストで併記する。
      </p>
    </div>
  ),
}

export const BarAndSpinner: Story = {
  render: () => (
    <div className="mx-auto max-w-[620px] p-6">
      <SectionHeading mark={EncodeIcon}>細プログレスとスピナー</SectionHeading>
      <Surface>
        <div className="mb-[7px] flex items-baseline justify-between gap-3">
          <span className="truncate text-ui">
            エンコード — 深夜の商店街をあるく
          </span>
          <b className="shrink-0 font-code text-sub font-medium tabular-nums text-ink-2">
            42%
          </b>
        </div>
        <ProgressBar value={42} label="エンコードの進捗" />
        <div className="mt-[15px] flex items-center gap-2.5 border-t border-dashed border-line pt-3.5 text-ui text-ink-2">
          <Spinner className="text-brand" />
          EPG を取得しています…
        </div>
      </Surface>
      <p className="mt-[9px] text-note text-ink-3">
        動くのはスピナーの回転と width
        のトランジションだけ。点滅・パルスは使わない。
      </p>
    </div>
  ),
}
