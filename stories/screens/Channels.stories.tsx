import type { Meta, StoryObj } from '@storybook/nextjs'

import { CHANNEL_SCAN } from '@/repository/tuners.fixtures'
import { ChannelsView } from '@/page-component/settings/channels-view'

const meta = {
  title: 'Screens/設定・チャンネル',
  component: ChannelsView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ChannelsView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = { args: { result: CHANNEL_SCAN } }

export const スキャン前: Story = {
  args: {
    result: {
      ...CHANNEL_SCAN,
      warning: undefined,
      lastScan: 'スキャンはまだ実行されていません',
      groups: CHANNEL_SCAN.groups.map((group) => ({
        ...group,
        stat: '0 サービス',
        services: [],
      })),
    },
  },
}
