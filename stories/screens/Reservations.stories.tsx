import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import type {
  Reservation,
  ReservationBatch,
  ReservationRevision,
  ReservationsResult,
  ReservationWrite,
} from '@/repository/reservations'
import {
  EPG_DRIFT_FIXTURES,
  EVERY_STANDING_FIXTURES,
  RESERVATION_FIXTURES,
  SETTLED_RESERVATION_FIXTURES,
} from '@/stories/fixtures/reservations'
import { ReservationsView } from '@/components/reservations/reservations-page'
import { afterTheArrival } from '@/stories/after-the-arrival'
import { cellOf, tipIn } from '@/stories/pills-in-a-column'

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

const revised: { id: string; revision: ReservationRevision }[] = []

const revising = async (
  id: string,
  revision: ReservationRevision,
): Promise<ReservationWrite> => {
  revised.push({ id, revision })

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
  drift: {
    diverged: items.filter((one) => one.epg?.diverged).length,
    missing: items.filter((one) => one.epg?.programmeMissing).length,
  },
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

const MARKED_REQUIRED = ['優先度', '前マージン(秒)', '後マージン(秒)']

function whatIsMarkedRequired(dialog: HTMLElement): string[] {
  return [...dialog.querySelectorAll('[data-slot="required-mark"]')].map(
    (mark) =>
      (mark.parentElement?.textContent ?? '')
        .replace(mark.textContent ?? '', '')
        .trim(),
  )
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

    await afterTheArrival(canvasElement)

    for (const row of canvasElement.querySelectorAll<HTMLElement>(
      'tbody > tr[data-slot="table-row"]',
    )) {
      const cells = [...row.children] as HTMLElement[]

      if (cells.length < 2) {
        continue
      }

      const lines = new Set(
        cells.map((cell) => getComputedStyle(cell).verticalAlign),
      )

      await expect([...lines]).toEqual(['top'])
    }
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
      ['山あいの町から', '確保済み'],
      ['午後のロードショー', '撮り逃し'],
    ]) {
      const row = rowFor(canvas.getByText(title))

      await expect(within(row).getByText(state)).toBeInTheDocument()
      await expect(
        within(row).queryByRole('link', { name: 'この予約の録画' }),
      ).toBeNull()
    }

    const removed = rowFor(canvas.getByText('真昼の博物誌'))

    await expect(within(removed).getByText('削除済み')).toBeInTheDocument()
    await expect(
      await tipIn(cellOf(removed, THE_STATE_COLUMN)),
    ).toHaveTextContent('完了')
    await expect(
      within(removed).queryByRole('link', { name: 'この予約の録画' }),
    ).toBeNull()

    for (const title of ['週末キッチンの手帖', '真夜中の音楽室']) {
      await expect(
        within(rowFor(canvas.getByText(title))).queryByText('削除済み'),
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

    await afterTheArrival(canvasElement)

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

      await expect(within(row).getByText('削除済み')).toBeInTheDocument()
      await expect(
        await tipIn(cellOf(row, THE_STATE_COLUMN)),
      ).toHaveTextContent(standing)
    }

    for (const title of ['朝のニュース', '午後のロードショー']) {
      await expect(
        within(rowFor(canvas.getByText(title))).queryByText('削除済み'),
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
    await afterTheArrival(canvasElement)
    const canvas = within(canvasElement)

    await userEvent.click(
      within(rowFor(canvas.getByText('朝のニュース'))).getByRole('button', {
        name: '削除',
      }),
    )
    await afterTheArrival(canvasElement)
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: '削除する',
      }),
    )

    await canvas.findByText(STILL_TO_BE_RECORDED)
    await afterTheArrival(canvasElement)
    await expect(canvas.getByText(STILL_TO_BE_RECORDED)).toBeVisible()
    await expect(canvas.getByText('朝のニュース')).toBeVisible()
  },
}

const LEFT_OUT_ONCE_THE_BROADCAST_ENDS = ['complete', 'cancelled']

const STILL_LISTED = EVERY_STANDING_FIXTURES.filter(
  (one) => !LEFT_OUT_ONCE_THE_BROADCAST_ENDS.includes(one.standing),
)

const STANDING_WORDS = {
  scheduled: '確保済み',
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
    await afterTheArrival(canvasElement)

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
      canvas.getByRole('button', { name: '条件を消す' }),
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
      canvas.queryByRole('button', { name: '条件を消す' }),
    ).toBeNull()
    await expect(canvas.getByRole('link', { name: '予約を追加' })).toBeVisible()
  },
}

export const すべての予約を出している: Story = {
  args: {
    result: shown(EVERY_STANDING_FIXTURES, { filter: { show: 'all' } }),
  },
  play: async ({ canvasElement }) => {
    await afterTheArrival(canvasElement)

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

    await afterTheArrival(canvasElement)

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

export const 番組表が動いた予約: Story = {
  args: { result: shown(EPG_DRIFT_FIXTURES) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    for (const title of ['海辺の図書室', '灯台守の一日']) {
      const row = rowFor(canvas.getByText(title))

      await expect(
        await tipIn(cellOf(row, THE_STATE_COLUMN)),
      ).toHaveTextContent('番組変更')
    }

    const gone = rowFor(canvas.getByText('真夜中の音楽室'))
    const goneTip = await tipIn(cellOf(gone, THE_STATE_COLUMN))

    await expect(goneTip).toHaveTextContent('番組消失')
    await expect(goneTip).not.toHaveTextContent('番組変更')
    await expect(
      await tipIn(
        cellOf(
          rowFor(canvas.getByText('週末キッチンの手帖')),
          THE_STATE_COLUMN,
        ),
      ),
    ).not.toHaveTextContent('番組変更')

    await expect(
      canvas.getByRole('button', { name: '番組変更 2 件' }),
    ).toHaveAttribute('aria-pressed', 'false')
    await expect(
      canvas.getByRole('button', { name: '番組消失 1 件' }),
    ).toHaveAttribute('aria-pressed', 'false')
  },
}

export const 番組変更だけに絞ったとき: Story = {
  args: {
    result: shown(
      EPG_DRIFT_FIXTURES.filter((one) => one.epg?.diverged),
      {
        total: EPG_DRIFT_FIXTURES.length,
        drift: { diverged: 2, missing: 1 },
        filter: { epg: 'diverged' },
      },
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('button', { name: '番組変更 2 件' }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(
      canvas.getByRole('button', { name: '番組消失 1 件' }),
    ).toHaveAttribute('aria-pressed', 'false')
    await expect(canvas.queryByText('番組消失')).toBeNull()
    await expect(canvas.getAllByRole('row').slice(1)).toHaveLength(2)
  },
}

export const 番組表が動いた予約はどこが動いたかを言う: Story = {
  args: { result: shown(EPG_DRIFT_FIXTURES) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const row = rowFor(canvas.getByText('海辺の図書室'))

    await userEvent.hover(
      within(row)
        .getAllByRole('cell')
        [THE_STATE_COLUMN].querySelector(
          '[data-slot="term-tip"]',
        ) as HTMLElement,
    )

    const said = await screen.findByRole('tooltip')

    await expect(said).toHaveTextContent('開始 08/12 20:00 → 08/12 20:30')
    await expect(said).toHaveTextContent('終了 08/12 20:45 → 08/12 21:15')
    await expect(said).toHaveTextContent('08/11 06:20 に検出')
  },
}

export const 予約ごとにエンコードを切り替える: Story = {
  args: {
    result: shown(RESERVATION_FIXTURES),
    actions: {
      onCancel: accept,
      onRestore: accept,
      onRaise: accept,
      onRevise: revising,
      onDiscard: throwing,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    revised.length = 0

    await userEvent.click(
      within(rowFor(canvas.getByText('深夜アニメ劇場'))).getByRole('button', {
        name: '編集',
      }),
    )

    const first = within(await screen.findByRole('dialog'))

    await afterTheArrival(canvasElement)

    await expect(
      first.getByRole('switch', { name: 'エンコードする' }),
    ).toBeChecked()

    await userEvent.click(first.getByRole('button', { name: 'キャンセル' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    await userEvent.click(
      within(rowFor(canvas.getByText('ナイター中継 延長あり'))).getByRole(
        'button',
        { name: '編集' },
      ),
    )

    const dialog = within(await screen.findByRole('dialog'))

    await afterTheArrival(canvasElement)
    const encode = dialog.getByRole('switch', { name: 'エンコードする' })

    await expect(encode).not.toBeChecked()

    await userEvent.click(encode)
    await userEvent.click(dialog.getByRole('button', { name: '保存する' }))

    await waitFor(() =>
      expect(revised).toEqual([
        { id: 'r-302', revision: { encodeWhenRecorded: true } },
      ]),
    )
  },
}

export const 必須の欄は印が付いていて空では保存できない: Story = {
  args: {
    result: shown(RESERVATION_FIXTURES),
    actions: {
      onCancel: accept,
      onRestore: accept,
      onRaise: accept,
      onRevise: revising,
      onDiscard: throwing,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    revised.length = 0

    await userEvent.click(
      within(rowFor(canvas.getByText('深夜アニメ劇場'))).getByRole('button', {
        name: '編集',
      }),
    )

    const opened = await screen.findByRole('dialog')

    await afterTheArrival(canvasElement)
    const dialog = within(opened)

    await expect(whatIsMarkedRequired(opened)).toEqual(MARKED_REQUIRED)

    const save = dialog.getByRole('button', { name: '保存する' })
    const priority = dialog.getByLabelText(/優先度/)
    const before = dialog.getByLabelText(/前マージン/)
    const after = dialog.getByLabelText(/後マージン/)

    await userEvent.clear(priority)
    await userEvent.click(save)

    await expect(
      dialog.getByText('優先度は 1 〜 99 の半角数字です。'),
    ).toBeVisible()

    await userEvent.type(priority, '10')
    await userEvent.clear(before)
    await userEvent.click(save)

    await expect(
      dialog.getByText('マージンは 0 〜 3600 秒の半角数字です。'),
    ).toBeVisible()

    await userEvent.type(before, '10')
    await userEvent.clear(after)
    await userEvent.click(save)

    await expect(
      dialog.getByText('マージンは 0 〜 3600 秒の半角数字です。'),
    ).toBeVisible()

    await expect(revised).toEqual([])
  },
}

const THE_STATE_COLUMN = 6

const THE_ACTION_COLUMN = 7

function saidBy(row: HTMLElement, column: number): HTMLElement[] {
  const cell = within(row).getAllByRole('cell')[column]

  return [
    ...cell.querySelectorAll('[data-state-say], [data-slot="badge"]'),
  ].filter((one): one is HTMLElement => one instanceof HTMLElement)
}

export const 行の揃い: Story = {
  args: { result: shown(EVERY_STANDING_FIXTURES, { filter: { show: 'all' } }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const rows = canvas.getAllByRole('row').slice(1)
    const widths: number[] = []

    for (const row of rows) {
      const said = saidBy(row, THE_STATE_COLUMN)

      if (said.length === 0) {
        continue
      }

      await expect(said.length).toBe(1)

      for (const one of said) {
        await expect(
          Math.round(one.getBoundingClientRect().left),
        ).toBeGreaterThan(0)
        widths.push(
          Math.round(
            within(row)
              .getAllByRole('cell')
              [THE_STATE_COLUMN].getBoundingClientRect().width,
          ),
        )
      }
    }

    await expect(widths.length).toBeGreaterThan(1)
    await expect(new Set(widths).size).toBe(1)

    for (const row of rows) {
      const cell = within(row).getAllByRole('cell')[THE_ACTION_COLUMN]
      const actions = [
        ...within(cell).queryAllByRole('button'),
        ...within(cell).queryAllByRole('link'),
      ]

      if (actions.length < 2) {
        continue
      }

      const drawn = actions.map((one) => one.getBoundingClientRect())

      await expect(
        new Set(drawn.map((box) => Math.round(box.width))).size,
      ).toBe(1)
      await expect(new Set(drawn.map((box) => Math.round(box.top))).size).toBe(
        1,
      )

      for (const action of actions) {
        await expect(action.querySelector('svg')).not.toBeNull()
      }
    }
  },
}
