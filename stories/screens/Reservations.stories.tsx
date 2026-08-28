import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, within } from 'storybook/test'

import type {
  Reservation,
  ReservationsResult,
  ReservationWrite,
} from '@/repository/reservations'
import {
  RESERVATION_FIXTURES,
  SETTLED_RESERVATION_FIXTURES,
} from '@/stories/fixtures/reservations'
import { ReservationsView } from '@/components/reservations/reservations-page'

const accept = async (): Promise<ReservationWrite> => ({ state: 'ok' })

const shown = (
  items: Reservation[],
  over: Partial<ReservationsResult> = {},
): ReservationsResult => ({
  items,
  total: items.length,
  filter: {},
  ...over,
})

const meta = {
  title: 'Screens/予約',
  component: ReservationsView,
  parameters: { layout: 'fullscreen' },
  args: {
    actions: {
      onCancel: accept,
      onRestore: accept,
      onRaise: accept,
      onRevise: accept,
    },
  },
} satisfies Meta<typeof ReservationsView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = {
  args: { result: shown(RESERVATION_FIXTURES) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Where it lands, not that it can be pressed. A reservation is made by
    // picking a programme, so this goes to the guide and there is no second
    // screen for picking one; a check that only pressed it would stay green
    // through the day somebody points it somewhere else.
    await expect(
      canvas.getByRole('link', { name: '予約を追加' }),
    ).toHaveAttribute('href', '/guide')
  },
}

export const 競合なし: Story = {
  args: {
    result: shown(
      RESERVATION_FIXTURES.filter((r) => r.standing !== 'conflict'),
    ),
  },
}

export const 終わった予約: Story = {
  args: {
    result: shown(SETTLED_RESERVATION_FIXTURES, {
      filter: { cancelled: 'all' },
    }),
  },
}

export const 放送の終わった取消を隠している: Story = {
  args: { result: shown(RESERVATION_FIXTURES, { total: 46 }) },
}
