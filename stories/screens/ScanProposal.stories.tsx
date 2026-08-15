import type { Meta, StoryObj } from '@storybook/nextjs'

import { SCAN_PROPOSAL } from '@/repository/services.fixtures'
import { ScanProposalView } from '@/page-component/settings/scan-proposal-view'

const noop = async () => {}

const meta = {
  title: 'Screens/設定・スキャン結果',
  component: ScanProposalView,
  parameters: { layout: 'fullscreen' },
  args: { onApply: noop },
} satisfies Meta<typeof ScanProposalView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = { args: { proposal: SCAN_PROPOSAL } }

export const 変更なし: Story = {
  args: {
    proposal: {
      ...SCAN_PROPOSAL,
      added: [],
      updated: [],
      missing: [],
      leftRotation: [],
      empty: true,
    },
  },
}

export const 結果が残っていない: Story = { args: { proposal: undefined } }
