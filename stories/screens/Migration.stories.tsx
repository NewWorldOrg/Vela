import type { Meta, StoryObj } from '@storybook/nextjs'

import {
  MIGRATION,
  MORE_NOT_TAKEN_THAN_FIT,
} from '@/repository/migration.fixtures'
import { MigrationView } from '@/components/migration/migration-page'
import { scrollsInsideWithItsHeaderHeld } from '@/stories/scrolls-inside'

const meta = {
  title: 'Screens/設定・移行記録',
  component: MigrationView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof MigrationView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = { args: { result: MIGRATION } }

export const 記録なし: Story = { args: { result: null } }

export const 収まらないほどの明細: Story = {
  args: { result: MORE_NOT_TAKEN_THAN_FIT },
  play: async ({ canvasElement }) => {
    await scrollsInsideWithItsHeaderHeld(canvasElement, '対象')
  },
}

export const 狭い幅で収まらないほどの明細: Story = {
  args: { result: MORE_NOT_TAKEN_THAN_FIT },
  parameters: { screen: { width: 768, height: 1024 } },
  play: async ({ canvasElement }) => {
    await scrollsInsideWithItsHeaderHeld(canvasElement, '対象')
  },
}
