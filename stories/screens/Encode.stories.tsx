import type { Meta, StoryObj } from '@storybook/nextjs'

import { ENCODE } from '@/repository/encode.fixtures'
import { EncodeView } from '@/page-component/settings/encode-view'

const meta = {
  title: 'Screens/設定・エンコード',
  component: EncodeView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof EncodeView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = { args: { result: ENCODE } }

export const ジョブなし: Story = {
  args: {
    result: { ...ENCODE, running: null, waiting: 0, failed: 0, failures: [] },
  },
}
