import type { Meta, StoryObj } from '@storybook/nextjs'

import { MIGRATION } from '@/repository/migration.fixtures'
import { MigrationView } from '@/components/migration/migration-page'

const meta = {
  title: 'Screens/設定・移行記録',
  component: MigrationView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof MigrationView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = { args: { result: MIGRATION } }

export const 記録なし: Story = { args: { result: null } }
