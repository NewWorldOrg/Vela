import type { Meta, StoryObj } from '@storybook/nextjs'

import { TUNERS } from '@/repository/tuners.fixtures'
import { TunersView } from '@/page-component/settings/tuners-view'

const meta = {
  title: 'Screens/設定・チューナー',
  component: TunersView,
  parameters: { layout: 'fullscreen' },
  args: {
    onToggle: async () => ({ state: 'ok' }),
    onRestart: async () => ({ state: 'disconnected' }),
    onReturn: async () => ({ state: 'waiting' }),
  },
} satisfies Meta<typeof TunersView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = {
  args: { result: { state: 'ok', result: TUNERS } },
}

export const 異常なし: Story = {
  args: {
    result: {
      state: 'ok',
      result: {
        ...TUNERS,
        notices: [],
        rows: TUNERS.rows.filter((row) => row.state !== 'faulted'),
      },
    },
  },
}

export const 差分なし: Story = {
  args: { result: { state: 'ok', result: { ...TUNERS, detectionDiff: [] } } },
}

export const 未設定: Story = {
  args: {
    result: {
      state: 'ok',
      result: { ...TUNERS, notices: [], rows: [], detectionDiff: [] },
    },
  },
}

export const driver未接続: Story = {
  args: {
    result: {
      state: 'ok',
      result: {
        ...TUNERS,
        connection: 'disconnected',
        instanceId: undefined,
        detectionDiff: [],
      },
    },
  },
}

export const driver状態不明: Story = {
  args: {
    result: {
      state: 'ok',
      result: {
        ...TUNERS,
        connection: 'unknown',
        instanceId: undefined,
        detectionDiff: [],
      },
    },
  },
}

export const サインインしていない: Story = {
  args: { result: { state: 'unauthenticated' } },
}

export const 状態を取得できない: Story = {
  args: {
    result: {
      state: 'unavailable',
      message: 'driver に接続できませんでした。',
    },
  },
}
