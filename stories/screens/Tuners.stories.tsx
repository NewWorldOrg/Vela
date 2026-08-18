import type { Meta, StoryObj } from '@storybook/nextjs'

import {
  DETECTION,
  DETECTION_MISMATCH_ONLY,
  TUNERS,
} from '@/repository/tuners.fixtures'
import { TunersView } from '@/components/tuners/tuners-page'

const meta = {
  title: 'Screens/設定・チューナー',
  component: TunersView,
  parameters: { layout: 'fullscreen' },
  args: {
    onToggle: async () => ({ state: 'ok' }),
    onRestart: async () => ({ state: 'disconnected' }),
    onDismiss: async () => {},
    onSaveDetection: async () => ({ state: 'ok' }),
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

export const 検出_差分あり: Story = {
  args: {
    result: { state: 'ok', result: TUNERS },
    detection: { state: 'ok', detection: DETECTION },
  },
}

export const 検出_差分なし: Story = {
  args: {
    result: { state: 'ok', result: TUNERS },
    detection: {
      state: 'ok',
      detection: { detected: [], rows: [], changes: false },
    },
  },
}

export const 検出_種別相違のみ: Story = {
  args: {
    result: { state: 'ok', result: TUNERS },
    detection: { state: 'ok', detection: DETECTION_MISMATCH_ONLY },
  },
}

export const 検出できない: Story = {
  args: {
    result: { state: 'ok', result: TUNERS },
    detection: {
      state: 'unavailable',
      message: 'driver に接続できませんでした。',
    },
  },
}

export const 未設定: Story = {
  args: {
    result: { state: 'ok', result: { ...TUNERS, notices: [], rows: [] } },
  },
}

export const 未設定から検出: Story = {
  args: {
    result: { state: 'ok', result: { ...TUNERS, notices: [], rows: [] } },
    detection: { state: 'ok', detection: DETECTION },
  },
}

export const driver未接続: Story = {
  args: {
    result: {
      state: 'ok',
      result: { ...TUNERS, connection: 'disconnected', instanceId: undefined },
    },
  },
}

export const driver状態不明: Story = {
  args: {
    result: {
      state: 'ok',
      result: { ...TUNERS, connection: 'unknown', instanceId: undefined },
    },
  },
}

export const サインインしていない: Story = {
  args: { result: { state: 'unauthenticated' } },
}

export const 再起動中で読めない: Story = {
  args: {
    result: {
      state: 'unavailable',
      message: 'API は 503 を返しました。',
    },
    restartWindow: {
      state: 'restarting',
      deadline: Date.now() + 60 * 60 * 1000,
      budgetSeconds: 30,
    },
  },
}

export const 状態を取得できない: Story = {
  args: {
    result: {
      state: 'unavailable',
      message: 'driver に接続できませんでした。',
    },
  },
}
