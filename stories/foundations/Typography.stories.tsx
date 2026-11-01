import type { Meta, StoryObj } from '@storybook/nextjs'

const meta = {
  title: 'Foundations/Typography',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const STEPS: { className: string; spec: string; sample: string }[] = [
  {
    className: 'text-display font-bold',
    spec: '表示 40 / 44 / 700',
    sample: 'ライブラリ',
  },
  {
    className: 'text-display-s font-bold',
    spec: '表示 小 32 / 38 / 700',
    sample: '忍たま乱太郎',
  },
  {
    className: 'text-section font-bold',
    spec: '節 22 / 28 / 700',
    sample: 'アニメ新番組',
  },
  {
    className: 'text-heading font-bold',
    spec: '見出し 17 / 22 / 700',
    sample: '続きから',
  },
  {
    className: 'text-title font-semibold',
    spec: '項目 15 / 20 / 600',
    sample: 'ドラマ「港の診療所」#7',
  },
  {
    className: 'text-body',
    spec: '本文 14 / 21 / 400',
    sample: '古いアパートに暮らす人たちの、少し不思議な日々。',
  },
  {
    className: 'text-sub text-ink-2',
    spec: '補足 12.5 / 18 / 400',
    sample: '中央テレビ · 20:00 – 20:54',
  },
  {
    className: 'text-note font-semibold text-ink-2',
    spec: '小 12 / 17 / 600',
    sample: '今日 10/31(土)',
  },
]

export const Scale: Story = {
  render: () => (
    <div className="mx-auto max-w-[760px] px-10 py-8">
      {STEPS.map((step) => (
        <div
          key={step.spec}
          className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-hair py-4 first:border-t-0"
        >
          <span className={step.className}>{step.sample}</span>
          <span className="font-code text-note text-ink-2">{step.spec}</span>
        </div>
      ))}
      <p className="mt-6 font-code text-title font-semibold">
        18:54 – 20:00 · 1:05:12
      </p>
    </div>
  ),
}
