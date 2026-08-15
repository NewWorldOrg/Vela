import type { Meta, StoryObj } from '@storybook/nextjs'

import { CHANNELS, SCAN_RUNNING } from '@/repository/services.fixtures'
import { ChannelsView } from '@/page-component/settings/channels-view'

const noop = async () => {}
const refuse = async () => ({
  state: 'refused' as const,
  scanId: 'run-3',
  message:
    'すでにスキャンが実行中です。同時に走らせられるのは 1 本までです。実行中のスキャンを確認するか、キャンセルしてから開始してください。',
})

const meta = {
  title: 'Screens/設定・チャンネル',
  component: ChannelsView,
  parameters: { layout: 'fullscreen' },
  args: { onStart: refuse, onCancel: noop, onSelect: noop },
} satisfies Meta<typeof ChannelsView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = {
  args: { result: { state: 'ok', result: CHANNELS } },
}

export const 候補を開いた状態: Story = {
  args: { result: { state: 'ok', result: CHANNELS }, open: '50001-1024' },
}

export const スキャン中: Story = {
  args: {
    result: { state: 'ok', result: { ...CHANNELS, running: SCAN_RUNNING } },
  },
}

export const 未スキャン: Story = {
  args: {
    result: {
      state: 'ok',
      result: {
        unattributed: [],
        groups: CHANNELS.groups.map((group) => ({
          ...group,
          services: [],
          stat: '0 サービス',
          diagnosis: undefined,
          neverScanned: true,
        })),
        history: [],
      },
    },
  },
}

export const 取得できないとき: Story = {
  args: {
    result: { state: 'unavailable', message: 'driver に接続できません' },
  },
}
