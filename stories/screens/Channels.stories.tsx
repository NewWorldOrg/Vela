import type { Meta, StoryObj } from '@storybook/nextjs'

import type { WriteResult } from '@/repository/services'
import { CHANNELS, SCAN_RUNNING } from '@/repository/services.fixtures'
import { ChannelsView } from '@/components/channels/channels-page'

const accept = async (): Promise<WriteResult> => ({ state: 'ok' })
const refuseWrite = async (): Promise<WriteResult> => ({
  state: 'rejected',
  message:
    'このスキャンはすでに終わっているため、キャンセルできませんでした。最新の状態を読み直しました。',
})
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
  args: {
    onStart: refuse,
    onCancel: accept,
    onSelect: accept,
    onAdd: accept,
    onDelete: accept,
  },
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
    result: {
      state: 'ok',
      result: {
        ...CHANNELS,
        running: { state: 'read', progress: SCAN_RUNNING },
      },
    },
  },
}

export const スキャン中の状況を読めないとき: Story = {
  args: {
    onCancel: refuseWrite,
    result: {
      state: 'ok',
      result: {
        ...CHANNELS,
        groups: CHANNELS.groups.map((group) =>
          group.services.length === 0
            ? { ...group, walk: 'unknown' as const, diagnosis: undefined }
            : group,
        ),
        running: {
          state: 'unreadable',
          run: SCAN_RUNNING.run,
          message: 'driver に接続できません。',
        },
      },
    },
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
          walk: 'never' as const,
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
