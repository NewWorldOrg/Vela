import type { Meta, StoryObj } from '@storybook/nextjs'

import { MORE_TUNERS_THAN_FIT, QUALITY } from '@/repository/quality.fixtures'
import { QualityView } from '@/components/quality/quality-page'
import { scrollsInsideWithItsHeaderHeld } from '@/stories/scrolls-inside'

const meta = {
  title: 'Screens/設定・品質',
  component: QualityView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof QualityView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = { args: { result: QUALITY } }

export const 供給途絶なし: Story = {
  args: {
    result: {
      ...QUALITY,
      supplyOutage: undefined,
      anomalies: QUALITY.anomalies.filter((a) => a.level !== 'unreachable'),
    },
  },
}

export const 収まらないほどのチューナー: Story = {
  args: { result: MORE_TUNERS_THAN_FIT },
  play: async ({ canvasElement }) => {
    await scrollsInsideWithItsHeaderHeld(canvasElement, 'チューナー')
  },
}

export const 狭い幅で収まらないほどのチューナー: Story = {
  args: { result: MORE_TUNERS_THAN_FIT },
  parameters: { screen: { width: 768, height: 1024 } },
  play: async ({ canvasElement }) => {
    await scrollsInsideWithItsHeaderHeld(canvasElement, 'チューナー')
  },
}
