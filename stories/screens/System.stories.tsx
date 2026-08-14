import type { Meta, StoryObj } from '@storybook/nextjs'

import { SYSTEM_STATUS } from '@/repository/system.fixtures'
import { SystemView } from '@/page-component/settings/system-view'

const meta = {
  title: 'Screens/設定・システム',
  component: SystemView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SystemView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = { args: { status: SYSTEM_STATUS } }

export const サインインが必要: Story = {
  args: {
    status: {
      api: { state: 'ok', status: 'ok' },
      driver: { state: 'unauthenticated' },
    },
  },
}

export const driver未接続: Story = {
  args: {
    status: {
      api: { state: 'ok', status: 'ok' },
      driver: {
        state: 'ok',
        status: {
          connection: 'notConnected',
          hello: null,
          appProtocolVersion: '1',
          missingCapabilities: ['live'],
          driverUpdateRequired: true,
          observedAt: '2026-08-14T00:31:12.4821930+09:00',
        },
      },
    },
  },
}

export const API接続なし: Story = {
  args: {
    status: { api: { state: 'unreachable' }, driver: { state: 'unreachable' } },
  },
}
