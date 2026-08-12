import type { Meta, StoryObj } from '@storybook/nextjs'

import { TUNERS } from '@/repository/tuners.fixtures'
import { TunersView } from '@/page-component/settings/tuners-view'

const meta = {
  title: 'Screens/設定・チューナー',
  component: TunersView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TunersView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = { args: { result: TUNERS } }

export const 異常なし: Story = {
  args: {
    result: {
      ...TUNERS,
      notices: [],
      rows: TUNERS.rows.filter((row) => row.state !== 'faulted'),
    },
  },
}
