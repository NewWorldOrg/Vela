import type { Meta, StoryObj } from '@storybook/nextjs'

import { QUALITY } from '@/repository/quality'
import { QualityView } from '@/page-component/settings/quality-view'

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
