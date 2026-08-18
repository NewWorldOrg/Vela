import type { Meta, StoryObj } from '@storybook/nextjs'

import { RECORDING_DETAIL_FIXTURES } from '@/repository/recordings.details.fixtures'
import { RecordingDetailView } from '@/components/recordings/recording-detail-page'

function detail(id: string) {
  const found = RECORDING_DETAIL_FIXTURES.find((r) => r.id === id)
  if (!found) {
    throw new Error(`fixture ${id} not found`)
  }
  return found
}

const meta = {
  title: 'Screens/録画詳細',
  component: RecordingDetailView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof RecordingDetailView>

export default meta
type Story = StoryObj<typeof meta>

export const 完全: Story = { args: { detail: detail('1274') } }
export const 警告水準: Story = { args: { detail: detail('1266') } }
export const 尻切れ: Story = { args: { detail: detail('1247') } }
export const 失敗: Story = { args: { detail: detail('1239') } }
export const ファイル不在: Story = { args: { detail: detail('0731') } }
export const 録画中: Story = { args: { detail: detail('1291') } }
export const 未計測: Story = { args: { detail: detail('0412') } }
