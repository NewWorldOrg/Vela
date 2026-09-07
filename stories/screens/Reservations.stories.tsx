import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import type {
  Reservation,
  ReservationBatch,
  ReservationsResult,
  ReservationWrite,
} from '@/repository/reservations'
import {
  EVERY_STANDING_FIXTURES,
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
      filter: { show: 'all' },
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas
        .getAllByRole('link', { name: 'この予約の録画' })
        .map((one) => one.getAttribute('href')),
    ).toEqual(['/recordings/1247', '/recordings/1274'])

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

    const removed = rowFor(canvas.getByText('真昼の博物誌'))

    await expect(within(removed).getByText('完了')).toBeInTheDocument()
    await expect(within(removed).getByText('録画削除済み')).toBeInTheDocument()
    await expect(
      within(removed).queryByRole('link', { name: 'この予約の録画' }),
    ).toBeNull()

    for (const title of ['週末キッチンの手帖', '真夜中の音楽室']) {
      await expect(
        within(rowFor(canvas.getByText(title))).queryByText('録画削除済み'),
      ).toBeNull()
    }

    await expect(
      rowFor(canvas.getByText('週末キッチンの手帖')),
    ).toHaveAttribute('id', 'reservation-r-309')

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

    await expect(dialog.getByText('朝のニュース')).toBeVisible()
    await expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'ふたたびルールの対象になります',
    )
    await expect(discarded).toEqual([])

    await userEvent.click(dialog.getByRole('button', { name: '削除する' }))
    await waitFor(() => expect(discarded).toEqual(['r-305']))
  },
}

export const 録画が削除された予約: Story = {
  args: {
    result: shown(
      SETTLED_RESERVATION_FIXTURES.map(({ recordingId, ...rest }) =>
        recordingId === undefined ? rest : { ...rest, discardable: true },
      ),
      { filter: { show: 'all' } },
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    for (const [title, standing] of [
      ['真夜中の音楽室', '尻切れ'],
      ['週末キッチンの手帖', '完了'],
      ['真昼の博物誌', '完了'],
    ]) {
      const row = rowFor(canvas.getByText(title))

      await expect(within(row).getByText(standing)).toBeInTheDocument()
      await expect(within(row).getByText('録画削除済み')).toBeInTheDocument()
    }

    for (const title of ['朝のニュース', '午後のロードショー']) {
      await expect(
        within(rowFor(canvas.getByText(title))).queryByText('録画削除済み'),
      ).toBeNull()
    }

    await expect(
      canvas.queryAllByRole('link', { name: 'この予約の録画' }),
    ).toEqual([])
  },
}

export const 予約の削除を断られたとき: Story = {
  args: {
    result: shown(SETTLED_RESERVATION_FIXTURES, {
      filter: { show: 'all' },
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

const LEFT_OUT_ONCE_THE_BROADCAST_ENDS = ['complete', 'cancelled']

const STILL_LISTED = EVERY_STANDING_FIXTURES.filter(
  (one) => !LEFT_OUT_ONCE_THE_BROADCAST_ENDS.includes(one.standing),
)

const STANDING_WORDS = {
  scheduled: 'チューナー確保済み',
  conflict: '競合',
  cancelled: '取消済み',
  missed: '撮り逃し',
  recording: '録画中',
  complete: '完了',
  truncated: '尻切れ',
  failed: '失敗',
}

export const 未完了だけを出している: Story = {
  args: {
    result: shown(STILL_LISTED, {
      total: EVERY_STANDING_FIXTURES.length,
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const strip = within(canvas.getByRole('group', { name: '表示' }))

    await expect(strip.getByRole('button', { name: '未完了' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(strip.getByRole('button', { name: 'すべて' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    for (const standing of [
      'scheduled',
      'conflict',
      'missed',
      'recording',
      'truncated',
      'failed',
    ] as const) {
      await expect(canvas.getByText(STANDING_WORDS[standing])).toBeVisible()
    }

    for (const standing of ['complete', 'cancelled'] as const) {
      await expect(canvas.queryByText(STANDING_WORDS[standing])).toBeNull()
    }
  },
}

export const 未完了が一件も無い: Story = {
  args: { result: shown([], { total: EVERY_STANDING_FIXTURES.length }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('heading', { name: '未完了の予約はありません' }),
    ).toBeVisible()
    await expect(
      canvas.getByRole('button', { name: '絞り込みを解除' }),
    ).toBeEnabled()
    await expect(canvas.queryByRole('table')).toBeNull()
  },
}

export const 予約が一件も無い: Story = {
  args: { result: shown([]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('heading', { name: '予約はありません' }),
    ).toBeVisible()
    await expect(
      canvas.queryByRole('button', { name: '絞り込みを解除' }),
    ).toBeNull()
    await expect(canvas.getByRole('link', { name: '予約を追加' })).toBeVisible()
  },
}

export const すべての予約を出している: Story = {
  args: {
    result: shown(EVERY_STANDING_FIXTURES, { filter: { show: 'all' } }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const strip = within(canvas.getByRole('group', { name: '表示' }))

    await expect(strip.getByRole('button', { name: 'すべて' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(strip.getByRole('button', { name: '未完了' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    for (const word of Object.values(STANDING_WORDS)) {
      await expect(canvas.getByText(word)).toBeVisible()
    }
  },
}

export const 一括で選んで削除する: Story = {
  args: {
    result: shown(SETTLED_RESERVATION_FIXTURES, {
      filter: { show: 'all' },
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
