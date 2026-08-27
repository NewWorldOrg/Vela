import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import type { WriteResult } from '@/repository/services'
import { SCAN_PROPOSAL } from '@/repository/services.fixtures'
import { ScanProposalView } from '@/components/scan/scan-proposal-page'

const GONE =
  'このスキャンの差分はもう保持されていないため、保存できませんでした。別の保存が先に完了した可能性があります。チャンネル一覧を確かめ、反映されていなければスキャンし直してください。'

const HELD =
  'このスキャンの差分は別の保存が処理しています。この操作では何も書き換えられていません。少し待ってから状態を読み直してください。'

const accept = async (): Promise<WriteResult> => ({ state: 'ok' })
const refuse = async (): Promise<WriteResult> => ({
  state: 'rejected',
  message: GONE,
})

const wait = async (): Promise<WriteResult> => ({
  state: 'rejected',
  message: HELD,
})

/**
 * Presses the one button the page exists for. A refusal is only ever on screen
 * because the press was made and the answer came back — the page is drawn
 * without it, so a story that hands `onApply` a refusal and stops there is
 * drawing the same pixels as 通常.
 */
function applying(refusal: string) {
  return async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getAllByRole('button', { name: 'この内容で保存' })[0],
    )

    await waitFor(() => expect(canvas.getByText(refusal)).toBeVisible())
  }
}

const meta = {
  title: 'Screens/設定・スキャン結果',
  component: ScanProposalView,
  parameters: { layout: 'fullscreen' },
  args: { onApply: accept },
} satisfies Meta<typeof ScanProposalView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = {
  args: { result: { state: 'ok', proposal: SCAN_PROPOSAL } },
}

export const 変更なし: Story = {
  args: {
    result: {
      state: 'ok',
      proposal: {
        ...SCAN_PROPOSAL,
        added: [],
        updated: [],
        missing: [],
        leftRotation: [],
        empty: true,
      },
    },
  },
}

export const 保存できなかったとき: Story = {
  args: { result: { state: 'ok', proposal: SCAN_PROPOSAL }, onApply: refuse },
  play: applying(GONE),
}

export const 別の保存が処理しているとき: Story = {
  args: { result: { state: 'ok', proposal: SCAN_PROPOSAL }, onApply: wait },
  play: applying(HELD),
}

export const 結果が残っていない: Story = {
  args: { result: { state: 'gone' } },
}

export const サインインしていないとき: Story = {
  args: { result: { state: 'unauthenticated' } },
}

export const 取得できないとき: Story = {
  args: {
    result: { state: 'unavailable', message: 'driver に接続できません' },
  },
}
