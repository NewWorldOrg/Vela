import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import type {
  Reservation,
  ReservationBatch,
  ReservationsResult,
  ReservationWrite,
} from '@/repository/reservations'
import {
  RESERVATION_FIXTURES,
  SETTLED_RESERVATION_FIXTURES,
} from '@/stories/fixtures/reservations'
import { ReservationsView } from '@/components/reservations/reservations-page'

const accept = async (): Promise<ReservationWrite> => ({ state: 'ok' })

const discarded: string[] = []

const discardedTogether: string[] = []

const cancelledTogether: string[] = []

const acceptAll = async (ids: string[]): Promise<ReservationBatch> => ({
  state: 'ok',
  done: ids.length,
})

const throwingAll = async (ids: string[]): Promise<ReservationBatch> => {
  discardedTogether.push(...ids)

  return { state: 'ok', done: ids.length }
}

const cancellingAll = async (ids: string[]): Promise<ReservationBatch> => {
  cancelledTogether.push(...ids)

  return { state: 'ok', done: ids.length }
}

const throwing = async (id: string): Promise<ReservationWrite> => {
  discarded.push(id)

  return { state: 'ok' }
}

const STILL_TO_BE_RECORDED =
  'この予約はこれから録画される見込みがあるため、削除できませんでした。先に取り消してください。'

const shown = (
  items: Reservation[],
  over: Partial<ReservationsResult> = {},
): ReservationsResult => ({
  items,
  total: items.length,
  filter: {},
  ...over,
})

/** The bar the chosen rows are acted on from, told apart from the rows themselves. */
function chosenBar(canvas: ReturnType<typeof within>): HTMLElement {
  return canvas.getByRole('group', { name: '選択した予約の操作' })
}

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
      onDiscard: throwing,
    },
    bulk: { onCancelAll: acceptAll, onDiscardAll: acceptAll },
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

    // Both sides of the same button, named row by row. A check that only
    // looked for the rows without it would pass on a screen that offers it
    // nowhere at all.
    for (const title of ['朝のニュース', '午後のロードショー']) {
      await expect(
        within(rowFor(canvas.getByText(title))).getByRole('button', {
          name: '削除',
        }),
      ).toBeEnabled()
    }

    for (const title of [
      '山あいの町から',
      '真夜中の音楽室',
      '週末キッチンの手帖',
    ]) {
      await expect(
        within(rowFor(canvas.getByText(title))).queryByRole('button', {
          name: '削除',
        }),
      ).toBeNull()
    }

    discarded.length = 0
    await userEvent.click(
      within(rowFor(canvas.getByText('朝のニュース'))).getByRole('button', {
        name: '削除',
      }),
    )

    const dialog = within(await screen.findByRole('alertdialog'))

    // The question names the row it was opened on, and a cancelled row says
    // what its record was holding off.
    await expect(dialog.getByText('朝のニュース')).toBeVisible()
    await expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'ふたたびルールの対象になります',
    )
    await expect(discarded).toEqual([])

    await userEvent.click(dialog.getByRole('button', { name: '削除する' }))
    await waitFor(() => expect(discarded).toEqual(['r-305']))
  },
}

/**
 * The API refuses, because what the row was drawn from has moved on since. The
 * reason it gives is what says which way to go about it, so it reaches the row
 * rather than being folded into a failure.
 */
export const 予約の削除を断られたとき: Story = {
  args: {
    result: shown(SETTLED_RESERVATION_FIXTURES, {
      filter: { cancelled: 'all' },
    }),
    actions: {
      onCancel: accept,
      onRestore: accept,
      onRaise: accept,
      onRevise: accept,
      onDiscard: async (): Promise<ReservationWrite> => ({
        state: 'rejected',
        message: STILL_TO_BE_RECORDED,
      }),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      within(rowFor(canvas.getByText('朝のニュース'))).getByRole('button', {
        name: '削除',
      }),
    )
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: '削除する',
      }),
    )

    await expect(await canvas.findByText(STILL_TO_BE_RECORDED)).toBeVisible()
    await expect(canvas.getByText('朝のニュース')).toBeVisible()
  },
}

export const 放送の終わった取消を隠している: Story = {
  args: { result: shown(RESERVATION_FIXTURES, { total: 46 }) },
}

/**
 * Several rows chosen at once. What the bar offers is what a row offers, and it
 * offers each only while every chosen row would take it: a settled reservation
 * has nothing left to cancel, so choosing one puts 取り消す out of reach.
 */
export const 一括で選んで削除する: Story = {
  args: {
    result: shown(SETTLED_RESERVATION_FIXTURES, {
      filter: { cancelled: 'all' },
    }),
    bulk: { onCancelAll: cancellingAll, onDiscardAll: throwingAll },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('checkbox', { name: '朝のニュース を選ぶ' }),
    )
    await userEvent.click(
      canvas.getByRole('checkbox', { name: '真昼の博物誌 を選ぶ' }),
    )

    const bar = within(chosenBar(canvas))

    await expect(bar.getByText('2')).toBeVisible()
    await expect(bar.getByRole('button', { name: '取り消す' })).toBeDisabled()

    await userEvent.click(bar.getByRole('button', { name: '削除' }))

    const dialog = within(await screen.findByRole('alertdialog'))

    await expect(
      dialog.getByText('選択した 2 件の予約を削除します'),
    ).toBeVisible()

    await userEvent.click(dialog.getByRole('button', { name: '削除する' }))
    await waitFor(() => expect(discardedTogether).toEqual(['r-305', 'r-310']))
  },
}

/**
 * The head of the list takes the whole page at once. This page holds a
 * reservation being recorded, which is neither cancelled nor thrown away, so
 * taking all of it leaves both operations out of reach until the selection is
 * narrowed to rows that would all take one.
 */
export const 一括で選んで取り消す: Story = {
  args: {
    result: shown(RESERVATION_FIXTURES),
    bulk: { onCancelAll: cancellingAll, onDiscardAll: throwingAll },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const all = canvas.getByRole('checkbox', {
      name: '表示中の予約をすべて選ぶ',
    })

    await userEvent.click(all)

    const whole = within(chosenBar(canvas))

    await expect(whole.getByRole('button', { name: '取り消す' })).toBeDisabled()
    await expect(whole.getByRole('button', { name: '削除' })).toBeDisabled()

    await userEvent.click(all)
    await userEvent.click(
      canvas.getByRole('checkbox', { name: '週末キッチンの手帖 を選ぶ' }),
    )
    await userEvent.click(
      canvas.getByRole('checkbox', { name: 'ナイター中継 延長あり を選ぶ' }),
    )

    const some = within(chosenBar(canvas))

    await expect(some.getByRole('button', { name: '削除' })).toBeDisabled()

    await userEvent.click(some.getByRole('button', { name: '取り消す' }))
    await waitFor(() => expect(cancelledTogether).toEqual(['r-301', 'r-302']))
  },
}
