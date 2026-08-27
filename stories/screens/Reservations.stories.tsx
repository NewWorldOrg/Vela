import type { Meta, StoryObj } from '@storybook/nextjs'

import type { ReservationWrite } from '@/repository/reservations'
import {
  RESERVATION_FIXTURES,
  SETTLED_RESERVATION_FIXTURES,
} from '@/stories/fixtures/reservations'
import { ReservationsView } from '@/components/reservations/reservations-page'

const accept = async (): Promise<ReservationWrite> => ({ state: 'ok' })

const meta = {
  title: 'Screens/予約',
  component: ReservationsView,
  parameters: { layout: 'fullscreen' },
  args: {
    actions: { onCancel: accept, onRestore: accept, onRaise: accept },
  },
} satisfies Meta<typeof ReservationsView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = { args: { reservations: RESERVATION_FIXTURES } }

export const 競合なし: Story = {
  args: {
    reservations: RESERVATION_FIXTURES.filter((r) => r.standing !== 'conflict'),
  },
}

export const 終わった予約: Story = {
  args: { reservations: SETTLED_RESERVATION_FIXTURES },
}
