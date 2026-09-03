import type { Meta, StoryObj } from '@storybook/nextjs'

import {
  DRIVER_CAPABILITIES,
  SYSTEM_STATUS,
} from '@/repository/system.fixtures'
import { SystemView } from '@/components/system/system-page'

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

export const 機能が足りない: Story = {
  args: {
    status: {
      api: { state: 'ok', status: 'ok' },
      driver: {
        state: 'ok',
        status: {
          connection: 'connected',
          hello: {
            protocolVersion: '1',
            instanceId: '4f1c8a926d0b4e779a351cb2e0f74d58',
            capabilities: DRIVER_CAPABILITIES.slice(0, 12),
            draining: false,
          },
          appProtocolVersion: '2',
          missingCapabilities: ['descrambling', 'storage'],
          driverUpdateRequired: true,
          observedAt: '2026-08-14T00:31:12.4821930+09:00',
        },
      },
    },
  },
}

export const 停止準備中: Story = {
  args: {
    status: {
      api: { state: 'ok', status: 'ok' },
      driver: {
        state: 'ok',
        status: {
          connection: 'draining',
          hello: {
            protocolVersion: '1',
            instanceId: '4f1c8a926d0b4e779a351cb2e0f74d58',
            capabilities: DRIVER_CAPABILITIES,
            draining: true,
          },
          appProtocolVersion: '1',
          missingCapabilities: [],
          driverUpdateRequired: false,
          observedAt: '2026-08-14T00:31:12.4821930+09:00',
        },
      },
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
