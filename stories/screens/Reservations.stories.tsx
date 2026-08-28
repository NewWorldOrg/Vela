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

function rowFor(cell: HTMLElement): HTMLElement {
  const row = cell.closest('tr')

  if (!row) {
    throw new Error('the cell is not in a row')
  }

  return row
}

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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Which recordings, in which order, and not merely that something can be
    // pressed: a link pointing at the wrong recording passes every check that
    // only presses it.
    await expect(
      canvas
        .getAllByRole('link', { name: 'この予約の録画' })
        .map((one) => one.getAttribute('href')),
    ).toEqual(['/recordings/1247', '/recordings/1274'])

    // The rows that came to no recording, each said by the state it is in
    // rather than by the absence of a link — an absence a row that was never
    // drawn would satisfy just as well.
    for (const [title, state] of [
      ['朝のニュース', '取消済み'],
      ['山あいの町から', 'チューナー確保済み'],
      ['午後のロードショー', '撮り逃し'],
    ]) {
      const row = rowFor(canvas.getByText(title))

      await expect(within(row).getByText(state)).toBeInTheDocument()
      await expect(
        within(row).queryByRole('link', { name: 'この予約の録画' }),
      ).toBeNull()
    }

    // The anchor the recording screen sends the reader back to. Spelled here
    // rather than read off the row, so the two spellings have to agree.
    await expect(
      rowFor(canvas.getByText('週末キッチンの手帖')),
    ).toHaveAttribute('id', 'reservation-r-309')
  },
}

export const 放送の終わった取消を隠している: Story = {
  args: { result: shown(RESERVATION_FIXTURES, { total: 46 }) },
}
