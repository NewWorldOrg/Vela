import type { Meta, StoryObj } from '@storybook/nextjs'

import { RULES } from '@/repository/reservations'
import { RulesView } from '@/page-component/reservations/rules-view'

const meta = {
  title: 'Screens/ルール',
  component: RulesView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof RulesView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = { args: { rules: RULES } }
