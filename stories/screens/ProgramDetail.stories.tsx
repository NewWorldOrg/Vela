import type { Meta, StoryObj } from '@storybook/nextjs'

import { PROGRAM_FIXTURES } from '@/repository/programs.fixtures'
import { ProgramDetailView } from '@/components/guide/program-detail-page'

const meta = {
  title: 'Screens/番組詳細',
  component: ProgramDetailView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ProgramDetailView>

export default meta
type Story = StoryObj<typeof meta>

const detailed = PROGRAM_FIXTURES.find((p) => p.detail)!
const booked = PROGRAM_FIXTURES.find((p) => p.booked)!

export const 通常: Story = { args: { program: detailed, dayLabel: '8/8(金)' } }
export const 予約済み: Story = {
  args: { program: booked, dayLabel: '8/8(金)' },
}
