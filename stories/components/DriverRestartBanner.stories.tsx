import type { Meta, StoryObj } from '@storybook/nextjs'
import { userEvent, waitFor, within } from 'storybook/test'

import type {
  DriverRestartResult,
  DriverReturnResult,
  TunerNotice,
} from '@/repository/tuners'
import { DriverRestartBanner } from '@/page-component/settings/driver-restart-banner'

const NOTICE: TunerNotice = {
  tone: 'warn',
  body: '保存済み・未反映の変更があります。反映には driver の再起動が必要です。',
  restart: { recordings: 0 },
}

const HOLDING: TunerNotice = {
  ...NOTICE,
  restart: { recordings: 2, until: '08/07 21:15' },
}

const RETURNED: DriverReturnResult = {
  state: 'returned',
  instanceId: '70c03633c76c48d9',
}

/** Presses the button and waits for the band to answer. */
function press(text: string) {
  return async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: 'driver を再起動' }),
    )
    await waitFor(() => canvas.getByText(text, { exact: false }))
  }
}

function answering(result: DriverRestartResult) {
  return async () => result
}

const meta = {
  title: 'Components/driver 再起動の帯',
  component: DriverRestartBanner,
  parameters: { layout: 'padded' },
  args: {
    notice: NOTICE,
    instanceId: '0021b0276a1c48ae',
    onRestart: answering({
      state: 'accepted',
      instanceId: '0021b0276a1c48ae',
      budgetSeconds: 30,
    }),
    onReturn: async (): Promise<DriverReturnResult> => RETURNED,
  },
} satisfies Meta<typeof DriverRestartBanner>

export default meta
type Story = StoryObj<typeof meta>

export const 要求できる: Story = {}

export const 録画中で押せない: Story = {
  args: { notice: HOLDING },
}

export const 受け付けた: Story = {
  args: { onReturn: () => new Promise<DriverReturnResult>(() => {}) },
  play: press('再起動を受け付けました'),
}

export const 入れ替わった: Story = {
  play: press('driver が再起動しました'),
}

export const 戻ってこない: Story = {
  args: { onReturn: async () => ({ state: 'waiting' }) },
  play: press('まだ戻っていません'),
}

export const 録画中で断られた: Story = {
  args: {
    onRestart: answering({
      state: 'recording',
      recordings: 1,
      until: '08/07 21:15',
    }),
  },
  play: press('driver は再起動を断りました'),
}

export const driver未接続: Story = {
  args: { onRestart: answering({ state: 'disconnected' }) },
  play: press('driver が接続されていないため'),
}

export const driverが未対応: Story = {
  args: { onRestart: answering({ state: 'unsupported' }) },
  play: press('再起動の要求に対応していません'),
}

export const ビルドが揃っていない: Story = {
  args: { onRestart: answering({ state: 'mismatched' }) },
  play: press('要求には応答しません'),
}

export const サインインが切れている: Story = {
  args: { onRestart: answering({ state: 'unauthenticated' }) },
  play: press('サインインが切れているため'),
}

export const 応答が届かない: Story = {
  args: {
    onRestart: async () => {
      throw new Error('unreachable')
    },
  },
  play: press('API に届きませんでした'),
}

export const 反映待ちがない: Story = {
  args: { notice: undefined },
}
