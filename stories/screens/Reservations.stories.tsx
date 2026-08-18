import type { Meta, StoryObj } from '@storybook/nextjs'

import { RESERVATIONS } from '@/repository/reservations.fixtures'
import { ReservationsView } from '@/components/reservations/reservations-page'

const meta = {
  title: 'Screens/予約',
  component: ReservationsView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ReservationsView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = { args: { reservations: RESERVATIONS } }

export const 競合なし: Story = {
  args: { reservations: RESERVATIONS.filter((r) => r.state !== 'conflict') },
}
