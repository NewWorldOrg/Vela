import type { Meta, StoryObj } from '@storybook/nextjs'

import type { WriteResult } from '@/repository/services'
import { SCAN_PROPOSAL } from '@/repository/services.fixtures'
import { ScanProposalView } from '@/page-component/settings/scan-proposal-view'

const accept = async (): Promise<WriteResult> => ({ state: 'ok' })
const refuse = async (): Promise<WriteResult> => ({
  state: 'rejected',
  message:
    'このスキャンの差分はもう保持されていないため、保存できませんでした。定義は変わっていません。スキャンし直してください。',
})

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
