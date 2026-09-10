import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, within } from 'storybook/test'

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
    onSaveThreshold: async () => ({ state: 'ok' }),
  },
} satisfies Meta<typeof TunersView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = {
  args: { result: { state: 'ok', result: TUNERS } },
}

export const 進行中のセッションが物理選局値で分かる: Story = {
  args: { result: { state: 'ok', result: TUNERS } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('57ch')).toBeVisible()
    await expect(canvas.getByText('53ch')).toBeVisible()
    await expect(canvas.getByText('08/07 21:15')).toBeVisible()
  },
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

const TURNED_OFF_WHILE_HELD =
  'This device was turned off and comes out of service as soon as the session it holds ends.'

const NOTHING_CAME_BACK = 'The last three tunes on this device timed out.'

export const 異常と警告はdriverの一文を添えて出る: Story = {
  args: {
    result: {
      state: 'ok',
      result: {
        ...TUNERS,
        notices: [],
        rows: [
          {
            ...TUNERS.rows[0],
            id: 'adapter4',
            device: 'adapter4',
            session: undefined,
            idleLabel: '割当停止中',
            state: 'faulted',
            stateLabel: '異常',
            stateSub: NOTHING_CAME_BACK,
          },
          {
            ...TUNERS.rows[0],
            id: 'adapter5',
            device: 'adapter5',
            session: undefined,
            idleLabel: 'アイドル',
            state: 'warn',
            stateLabel: '警告',
            stateSub: TURNED_OFF_WHILE_HELD,
          },
        ],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('異常')).toBeVisible()
    await expect(canvas.getByText(NOTHING_CAME_BACK)).toBeVisible()
    await expect(canvas.getByText('警告')).toBeVisible()
    await expect(canvas.getByText(TURNED_OFF_WHILE_HELD)).toBeVisible()
  },
}
