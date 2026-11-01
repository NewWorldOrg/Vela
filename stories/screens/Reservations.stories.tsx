import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import type {
  Reservation,
  ReservationBatch,
  ReservationRevision,
  ReservationsResult,
  ReservationWrite,
} from '@/repository/reservations'
import { TUNERS } from '@/repository/tuners.fixtures'
import {
  CONTENDED_RELAY_FIXTURES,
  EPG_DRIFT_FIXTURES,
  RELAY_FIXTURES,
  SAME_BROADCAST_FIXTURES,
  EVERY_STANDING_FIXTURES,
  RESERVATION_FIXTURES,
  SETTLED_RESERVATION_FIXTURES,
} from '@/stories/fixtures/reservations'
import { ReservationsView } from '@/components/reservations/reservations-page'
import { afterTheArrival } from '@/stories/after-the-arrival'
import { tipIn } from '@/stories/pills-in-a-column'
import { inTheApp } from '@/stories/frames'
import { FROM_600, NARROW_PHONE, PHONE } from '@/stories/rows-as-cards'

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

/** The line of the list a word sits in: a reservation, a segment of a relay, or the line a relay folds into. */
function rowFor(inside: HTMLElement): HTMLElement {
  const row = inside.closest<HTMLElement>(
    'li[data-reservation], li[data-relay]',
  )

  if (!row) {
    throw new Error('the word is not in a row of the list')
  }

  return row
}

function rowOf(canvas: ReturnType<typeof within>, title: string): HTMLElement {
  const [first] = canvas
    .getAllByText(title)
    .filter(
      (one: HTMLElement) =>
        one.closest('[data-slot="reservation-list"]') !== null &&
        one.closest('li[data-reservation], li[data-relay]') !== null,
    )

  if (!first) {
    throw new Error(`${title} is not in the list`)
  }

  return rowFor(first)
}

function chipsOf(row: HTMLElement): HTMLElement {
  const chips = row.querySelector<HTMLElement>('[data-slot="row-chips"]')

  if (!chips) {
    throw new Error('the row has no place for its chips')
  }

  return chips
}

function listOf(canvasElement: HTMLElement): HTMLElement {
  const list = canvasElement.querySelector<HTMLElement>(
    '[data-slot="reservation-list"]',
  )

  if (!list) {
    throw new Error('the list is not drawn')
  }

  return list
}

async function openRow(
  canvas: ReturnType<typeof within>,
  title: string,
): Promise<HTMLElement> {
  const row = rowOf(canvas, title)

  await userEvent.click(within(row).getByRole('button', { name: title }))

  return await waitFor(() => {
    const change = row.querySelector<HTMLElement>(
      '[data-slot="reservation-change"]',
    )

    expect(change).not.toBeNull()

    return change!
  })
}

async function startPicking(canvas: ReturnType<typeof within>) {
  await userEvent.click(canvas.getByRole('button', { name: '選ぶ' }))
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
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/reservations' } },
    layout: 'fullscreen',
  },
  args: {
    actions: {
      onCancel: accept,
      onRestore: accept,
      onRaise: accept,
      onRevise: accept,
      onDiscard: throwing,
    },
    bulk: { onCancelAll: acceptAll, onDiscardAll: acceptAll },
    tuners: TUNERS.rows,
  },
  decorators: [inTheApp],
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
    await expect(
      within(
        canvasElement.querySelector<HTMLElement>(
          '[data-slot="reservations-head"]',
        )!,
      ).getByRole('link', { name: '予約' }),
    ).toHaveAttribute('aria-current', 'page')

    await afterTheArrival(canvasElement)

    const list = listOf(canvasElement)

    await expect(list.querySelectorAll('h2').length).toBeGreaterThan(0)

    for (const row of list.querySelectorAll<HTMLElement>(
      'li[data-reservation] > div',
    )) {
      const middles = [...row.children].map((one) => {
        const box = one.getBoundingClientRect()

        return Math.round(box.top + box.height / 2)
      })

      await expect(Math.max(...middles) - Math.min(...middles)).toBeLessThan(3)
    }

    const side = canvas.getByRole('complementary', {
      name: '競合と次の録画',
    })

    await expect(
      within(side).getByRole('heading', { name: '録画が重なっています' }),
    ).toBeVisible()
    await expect(
      side.querySelector('[data-slot="conflict-overlap"]'),
    ).not.toBeNull()
    await expect(side.getBoundingClientRect().left).toBeGreaterThanOrEqual(
      list.getBoundingClientRect().right,
    )
  },
}

export const 行を開いたところ: Story = {
  args: { result: shown(RESERVATION_FIXTURES) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await afterTheArrival(canvasElement)

    const change = await openRow(canvas, 'ナイター中継 延長あり')
    const row = rowFor(change)

    await expect(
      within(row).getByRole('button', { name: 'ナイター中継 延長あり' }),
    ).toHaveAttribute('aria-expanded', 'true')
    await expect(row).toHaveTextContent('延長の可能性あり')
    await expect(within(change).getByLabelText(/前マージン/)).toHaveValue('10')
  },
}

export const 次の録画とチューナー: Story = {
  args: { result: shown(RESERVATION_FIXTURES) },
  play: async ({ canvasElement }) => {
    const next = within(
      canvasElement.querySelector<HTMLElement>('[data-slot="next-recording"]')!,
    )

    await expect(next.getByText('週末キッチンの手帖')).toBeVisible()
    await expect(
      next
        .getAllByRole('listitem')
        .map((one) => one.textContent?.replace(/\s+/g, ' ').trim()),
    ).toEqual(['地上波 · 録画中', '衛星 · 空き'])
  },
}

const PUSHED_OUT = [
  {
    title: '夜ふかしラジオ倶楽部',
    meta: '湾岸放送1 · 22:30 – 23:30',
    origin: '手動',
  },
  {
    title: '水曜ドラマ「約束の丘」',
    meta: '中央テレビ1 · 23:00 – 24:00',
    origin: 'ルール',
    ruleName: 'ドラマの最終回だけ',
  },
]

const pushingOut = async (): Promise<ReservationWrite> => ({
  state: 'ok',
  verdict: 'secured',
  displaced: PUSHED_OUT,
})

function conflictPanel(canvasElement: HTMLElement): HTMLElement {
  const panel = canvasElement.querySelector<HTMLElement>(
    '[data-slot="conflict-panel"]',
  )

  if (!panel) {
    throw new Error('no conflict is drawn beside the list')
  }

  return panel
}

export const 優先度を上げて競合になった予約を示す: Story = {
  args: {
    result: shown(RESERVATION_FIXTURES),
    actions: {
      onCancel: accept,
      onRestore: accept,
      onRaise: pushingOut,
      onRevise: accept,
      onDiscard: throwing,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await afterTheArrival(canvasElement)
    await expect(canvas.queryByText('次の予約が競合になりました。')).toBeNull()

    const panel = within(conflictPanel(canvasElement))

    await expect(
      panel.getByRole('link', { name: 'チューナーへ' }),
    ).toHaveAttribute('href', '/settings/tuners')
    await expect(panel.getAllByText('録る方')).toHaveLength(2)
    await expect(panel.getByText('頭 60 分が欠ける')).toBeVisible()

    await userEvent.click(panel.getByRole('button', { name: 'こちらを録る' }))

    const notice = (
      await panel.findByText('次の予約が競合になりました。')
    ).closest('[data-slot="displaced"]') as HTMLElement

    await expect(notice).toHaveTextContent('夜ふかしラジオ倶楽部')
    await expect(notice).toHaveTextContent('湾岸放送1 · 22:30 – 23:30')
    await expect(notice).toHaveTextContent('ドラマの最終回だけ')
    await expect(
      [...notice.querySelectorAll('[data-slot="conflict-entry-title"]')].map(
        (one) => one.textContent?.trim(),
      ),
    ).toEqual(['夜ふかしラジオ倶楽部', '水曜ドラマ「約束の丘」'])
  },
}

export const 優先度を上げても何も落ちなければ何も言わない: Story = {
  args: { result: shown(RESERVATION_FIXTURES) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await afterTheArrival(canvasElement)

    const panel = within(conflictPanel(canvasElement))

    await userEvent.click(panel.getByRole('button', { name: 'こちらを録る' }))
    await waitFor(() =>
      expect(panel.getByRole('button', { name: 'こちらを録る' })).toBeEnabled(),
    )
    await expect(canvas.queryByText('次の予約が競合になりました。')).toBeNull()
  },
}

export const 競合の予約は行のばつで取り消す: Story = {
  args: {
    result: shown(RESERVATION_FIXTURES),
    actions: {
      onCancel: async (id: string) => {
        cancelledInTheList.push(id)

        return { state: 'ok' as const }
      },
      onRestore: accept,
      onRaise: accept,
      onRevise: accept,
      onDiscard: throwing,
    },
  },
  beforeEach: () => {
    cancelledInTheList.length = 0
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await afterTheArrival(canvasElement)

    const row = rowOf(canvas, '金曜シネマ「星の渡り鳥」')

    await expect(
      within(chipsOf(row)).getByText('頭 60 分が欠ける'),
    ).toBeVisible()
    await userEvent.click(within(row).getByRole('button', { name: '取り消し' }))
    await waitFor(() => expect(cancelledInTheList).toEqual(['r-303']))

    const toast = await waitFor(() => {
      const found = canvasElement.querySelector<HTMLElement>(
        '[data-slot="toast"]',
      )

      expect(found).not.toBeNull()

      return found!
    })

    await expect(toast).toHaveTextContent('予約を取り消しました')
    await expect(
      within(toast).getByRole('button', { name: '元に戻す' }),
    ).toBeVisible()
  },
}

const cancelledInTheList: string[] = []

export const 編集で競合になった予約を示す: Story = {
  args: {
    result: shown(RESERVATION_FIXTURES),
    actions: {
      onCancel: accept,
      onRestore: accept,
      onRaise: accept,
      onRevise: pushingOut,
      onDiscard: throwing,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await afterTheArrival(canvasElement)

    const change = within(await openRow(canvas, '週末キッチンの手帖'))

    await userEvent.click(
      change.getByRole('switch', { name: '自動エンコード' }),
    )
    await userEvent.click(change.getByRole('button', { name: '保存する' }))

    await expect(
      await canvas.findByText('次の予約が競合になりました。'),
    ).toBeVisible()
  },
}

export const 競合なし: Story = {
  args: {
    result: shown(
      RESERVATION_FIXTURES.filter((r) => r.standing !== 'conflict'),
    ),
  },
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelector('[data-slot="conflict-panel"]'),
    ).toBeNull()
    await expect(
      canvasElement.querySelector('[data-slot="next-recording"]'),
    ).not.toBeNull()
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
        .getAllByRole('link', { name: 'この予約の録画へ' })
        .map((one) => one.getAttribute('href'))
        .sort(),
    ).toEqual(['/recordings/1247', '/recordings/1274'])

    for (const [title, state] of [
      ['朝のニュース', '取消済み'],
      ['午後のロードショー', '録り逃し'],
    ]) {
      const row = rowOf(canvas, title)

      await expect(within(chipsOf(row)).getByText(state)).toBeInTheDocument()
      await expect(
        within(row).queryByRole('link', { name: 'この予約の録画へ' }),
      ).toBeNull()
    }

    await expect(
      within(chipsOf(rowOf(canvas, '山あいの町から'))).queryByText('確保済み'),
    ).toBeNull()

    const removed = rowOf(canvas, '真昼の博物誌')

    await expect(within(removed).getByText('削除済み')).toBeInTheDocument()
    await expect(await tipIn(chipsOf(removed))).toHaveTextContent('完了')
    await expect(
      within(removed).queryByRole('link', { name: 'この予約の録画へ' }),
    ).toBeNull()

    for (const title of ['週末キッチンの手帖', '真夜中の音楽室']) {
      await expect(
        within(rowOf(canvas, title)).queryByText('削除済み'),
      ).toBeNull()
    }

    await expect(rowOf(canvas, '週末キッチンの手帖')).toHaveAttribute(
      'id',
      'reservation-r-309',
    )

    for (const title of ['朝のニュース', '午後のロードショー']) {
      await expect(
        within(rowOf(canvas, title)).getByRole('button', { name: '削除' }),
      ).toBeEnabled()
    }

    for (const title of [
      '山あいの町から',
      '真夜中の音楽室',
      '週末キッチンの手帖',
    ]) {
      await expect(
        within(rowOf(canvas, title)).queryByRole('button', { name: '削除' }),
      ).toBeNull()
    }

    discarded.length = 0
    await userEvent.click(
      within(rowOf(canvas, '朝のニュース')).getByRole('button', {
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
      const row = rowOf(canvas, title)

      await expect(within(row).getByText('削除済み')).toBeInTheDocument()
      await expect(await tipIn(chipsOf(row))).toHaveTextContent(standing)
    }

    for (const title of ['朝のニュース', '午後のロードショー']) {
      await expect(
        within(rowOf(canvas, title)).queryByText('削除済み'),
      ).toBeNull()
    }

    await expect(
      canvas.queryAllByRole('link', { name: 'この予約の録画へ' }),
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
      within(rowOf(canvas, '朝のニュース')).getByRole('button', {
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
    await expect(rowOf(canvas, '朝のニュース')).toBeVisible()
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
  missed: '録り逃し',
  recording: '録画中',
  complete: '完了',
  truncated: '尻切れ',
  failed: '失敗',
}

/** The standings a row says with a chip; a reservation that simply holds its tuner says nothing. */
const SAID_WITH_A_CHIP = Object.entries(STANDING_WORDS).filter(
  ([standing]) => standing !== 'scheduled',
)

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

    const list = within(listOf(canvasElement))

    for (const standing of [
      'conflict',
      'missed',
      'recording',
      'truncated',
      'failed',
    ] as const) {
      await expect(list.getByText(STANDING_WORDS[standing])).toBeVisible()
    }

    for (const standing of ['scheduled', 'complete', 'cancelled'] as const) {
      await expect(list.queryByText(STANDING_WORDS[standing])).toBeNull()
    }
  },
}

export const 未完了が一件も無い: Story = {
  args: { result: shown([], { total: EVERY_STANDING_FIXTURES.length }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('heading', { name: '未完了の予約がありません' }),
    ).toBeVisible()
    await expect(
      canvas.getByRole('button', { name: '条件を解除' }),
    ).toBeEnabled()
    await expect(
      canvasElement.querySelector('[data-slot="reservation-list"]'),
    ).toBeNull()
  },
}

export const 予約が一件も無い: Story = {
  args: { result: shown([]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('heading', { name: '予約がありません' }),
    ).toBeVisible()
    await expect(
      canvas.queryByRole('button', { name: '条件を解除' }),
    ).toBeNull()
    await expect(canvas.getByRole('link', { name: '予約を追加' })).toBeVisible()
    await expect(canvas.queryByRole('button', { name: '選ぶ' })).toBeNull()
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

    const list = within(listOf(canvasElement))

    for (const [, word] of SAID_WITH_A_CHIP) {
      await expect(list.getByText(word)).toBeVisible()
    }
  },
}

export const 選ぶと行の前に印が出る: Story = {
  args: { result: shown(RESERVATION_FIXTURES) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await afterTheArrival(canvasElement)

    await expect(canvas.queryAllByRole('checkbox')).toHaveLength(0)
    await startPicking(canvas)
    await expect(canvas.getByRole('button', { name: '選ぶ' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(
      canvas.getByRole('checkbox', { name: '表示中の予約をすべて選ぶ' }),
    ).toBeVisible()
    await expect(
      canvas.getByRole('checkbox', { name: '週末キッチンの手帖 を選ぶ' }),
    ).toBeVisible()
    await startPicking(canvas)
    await expect(canvas.queryAllByRole('checkbox')).toHaveLength(0)
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

    await startPicking(canvas)
    await userEvent.click(
      canvas.getByRole('checkbox', { name: '朝のニュース を選ぶ' }),
    )
    await userEvent.click(
      canvas.getByRole('checkbox', { name: '真昼の博物誌 を選ぶ' }),
    )

    const bar = within(chosenBar(canvas))

    await expect(bar.getByText('2')).toBeVisible()
    await expect(bar.getByRole('button', { name: '取り消し' })).toBeDisabled()

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

    await startPicking(canvas)

    const all = canvas.getByRole('checkbox', {
      name: '表示中の予約をすべて選ぶ',
    })

    await userEvent.click(all)

    const whole = within(chosenBar(canvas))

    await expect(whole.getByRole('button', { name: '取り消し' })).toBeDisabled()
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

    await userEvent.click(some.getByRole('button', { name: '取り消し' }))
    await waitFor(() => expect(cancelledTogether).toEqual(['r-301', 'r-302']))
  },
}

export const 番組表が動いた予約: Story = {
  args: { result: shown(EPG_DRIFT_FIXTURES) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await afterTheArrival(canvasElement)

    for (const title of ['海辺の図書室', '灯台守の一日']) {
      await expect(
        within(chipsOf(rowOf(canvas, title))).getByText('番組変更'),
      ).toBeVisible()
    }

    const goneTip = await tipIn(chipsOf(rowOf(canvas, '真夜中の音楽室')))

    await expect(goneTip).toHaveTextContent('番組消失')
    await expect(goneTip).not.toHaveTextContent('番組変更')
    await expect(
      within(chipsOf(rowOf(canvas, '週末キッチンの手帖'))).queryByText(
        '番組変更',
      ),
    ).toBeNull()

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
    await expect(
      listOf(canvasElement).querySelectorAll('li[data-reservation]'),
    ).toHaveLength(2)
  },
}

export const 番組表が動いた予約はどこが動いたかを言う: Story = {
  args: { result: shown(EPG_DRIFT_FIXTURES) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const said = await tipIn(chipsOf(rowOf(canvas, '海辺の図書室')))

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
    await afterTheArrival(canvasElement)

    const first = within(await openRow(canvas, '深夜アニメ劇場'))

    await expect(
      first.getByRole('switch', { name: '自動エンコード' }),
    ).toBeChecked()

    await userEvent.click(first.getByRole('button', { name: 'キャンセル' }))
    await waitFor(() =>
      expect(
        canvasElement.querySelector('[data-slot="reservation-change"]'),
      ).toBeNull(),
    )

    const change = within(await openRow(canvas, 'ナイター中継 延長あり'))
    const encode = change.getByRole('switch', { name: '自動エンコード' })

    await expect(encode).not.toBeChecked()

    await userEvent.click(encode)
    await userEvent.click(change.getByRole('button', { name: '保存する' }))

    await waitFor(() =>
      expect(revised).toEqual([
        { id: 'r-302', revision: { encodeWhenRecorded: true } },
      ]),
    )
  },
}

export const 前後のマージンは増やすと減らすで変える: Story = {
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
    await afterTheArrival(canvasElement)

    const opened = await openRow(canvas, '週末キッチンの手帖')
    const change = within(opened)
    const steppers = opened.querySelectorAll<HTMLElement>(
      '[data-slot="stepper"]',
    )

    await userEvent.click(
      within(steppers[0]).getByRole('button', { name: '1 増やす' }),
    )
    await userEvent.click(
      within(steppers[1]).getByRole('button', { name: '10 減らす' }),
    )
    await userEvent.click(
      within(steppers[2]).getByRole('button', { name: '10 増やす' }),
    )
    await expect(change.getByLabelText(/優先度/)).toHaveValue('11')
    await expect(change.getByLabelText(/前マージン/)).toHaveValue('0')
    await expect(change.getByLabelText(/後マージン/)).toHaveValue('40')
    await expect(
      within(steppers[1]).getByRole('button', { name: '10 減らす' }),
    ).toBeDisabled()

    await userEvent.click(change.getByRole('button', { name: '保存する' }))
    await waitFor(() =>
      expect(revised).toEqual([
        {
          id: 'r-301',
          revision: {
            priority: 11,
            marginBeforeSeconds: 0,
            marginAfterSeconds: 40,
          },
        },
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
    await afterTheArrival(canvasElement)

    const opened = await openRow(canvas, '深夜アニメ劇場')
    const change = within(opened)

    await expect(whatIsMarkedRequired(opened)).toEqual(MARKED_REQUIRED)

    const save = change.getByRole('button', { name: '保存する' })
    const priority = change.getByLabelText(/優先度/)
    const before = change.getByLabelText(/前マージン/)
    const after = change.getByLabelText(/後マージン/)

    await userEvent.clear(priority)
    await userEvent.click(save)

    await expect(
      change.getByText('優先度は 1 〜 99 の半角数字です。'),
    ).toBeVisible()

    await userEvent.type(priority, '10')
    await userEvent.clear(before)
    await userEvent.click(save)

    await expect(
      change.getByText('マージンは 0 〜 3600 秒の半角数字です。'),
    ).toBeVisible()

    await userEvent.type(before, '10')
    await userEvent.clear(after)
    await userEvent.click(save)

    await expect(
      change.getByText('マージンは 0 〜 3600 秒の半角数字です。'),
    ).toBeVisible()

    await expect(revised).toEqual([])
  },
}

export const 行の揃い: Story = {
  args: { result: shown(EVERY_STANDING_FIXTURES, { filter: { show: 'all' } }) },
  play: async ({ canvasElement }) => {
    await afterTheArrival(canvasElement)

    const rows = [
      ...listOf(canvasElement).querySelectorAll<HTMLElement>(
        'li[data-reservation] > div',
      ),
    ]
    const lefts = (pick: (row: HTMLElement) => Element) =>
      new Set(
        rows.map((row) => Math.round(pick(row).getBoundingClientRect().left)),
      )

    await expect(rows.length).toBeGreaterThan(4)
    await expect(lefts((row) => row.children[0]).size).toBe(1)
    await expect(lefts((row) => row.children[1]).size).toBe(1)

    const ends = rows.map((row) => row.lastElementChild!)
    const rights = new Set(
      ends.map((one) => Math.round(one.getBoundingClientRect().right)),
    )

    await expect(rights.size).toBe(1)

    for (const row of rows) {
      const title = row.children[1].getBoundingClientRect()
      const end = row.lastElementChild!.getBoundingClientRect()

      await expect(title.right).toBeLessThanOrEqual(end.left)
      await expect(Math.round(row.getBoundingClientRect().height)).toBe(62)
    }
  },
}

export const 中継で分かれた放送: Story = {
  args: { result: shown([RESERVATION_FIXTURES[0], ...RELAY_FIXTURES]) },
  play: async ({ canvasElement }) => {
    await afterTheArrival(canvasElement)

    const canvas = within(canvasElement)
    const relay = rowFor(canvas.getByText(/区切り 3 つ/))

    await expect(within(relay).getByText('湾岸杯 野球 決勝')).toBeVisible()
    await expect(relay).toHaveTextContent('みなと教育1')
    await expect(relay).toHaveTextContent('13:00')
    await expect(relay).toHaveTextContent('– 17:30')
    await expect(relay.querySelector('[data-slot="row-chips"]')).toBeNull()
    await expect(canvas.queryByText(/区切り 1 \/ 3/)).toBeNull()
    await expect(relay.querySelector('#reservation-r-402')).not.toBeNull()

    const toggle = within(relay).getByRole('button', { name: '区切りの一覧' })

    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await afterTheArrival(canvasElement)

    for (const [at, id] of [
      [1, 'r-401'],
      [2, 'r-402'],
      [3, 'r-403'],
    ] as const) {
      const row = rowFor(canvas.getByText(new RegExp(`区切り ${at} / 3`)))

      await expect(row).toHaveAttribute('id', `reservation-${id}`)
      await expect(
        within(row).getByRole('button', { name: '取り消し' }),
      ).toBeVisible()
    }

    await expect(relay.querySelector('[id^="reservation-"]')).toBeNull()

    await startPicking(canvas)
    await userEvent.click(
      within(relay).getByRole('checkbox', {
        name: '湾岸杯 野球 決勝 の区切りをすべて選ぶ',
      }),
    )
    await expect(within(chosenBar(canvas)).getByText('3')).toBeVisible()

    await userEvent.click(toggle)
    await expect(canvas.queryByText(/区切り 1 \/ 3/)).toBeNull()
  },
}

export const 区切りの一部だけを表示している中継: Story = {
  args: { result: shown(CONTENDED_RELAY_FIXTURES) },
  play: async ({ canvasElement }) => {
    await afterTheArrival(canvasElement)

    const canvas = within(canvasElement)
    const relay = rowFor(canvas.getByText(/区切り 3 つ\(うち 2 つを表示\)/))

    await expect(relay).toHaveTextContent('13:00')
    await expect(relay).toHaveTextContent('– 17:30')
    await expect(
      within(relay).getByRole('button', { name: '区切りの一覧' }),
    ).toHaveAttribute('aria-expanded', 'true')
    await expect(canvas.getByText(/区切り 1 \/ 3/)).toBeVisible()
    await expect(canvas.getByText(/区切り 2 \/ 3/)).toBeVisible()
    await expect(canvas.queryByText(/区切り 3 \/ 3/)).toBeNull()
    await expect(chipsOf(relay)).toHaveTextContent('競合')
    await expect(await tipIn(chipsOf(relay))).toHaveTextContent(
      '区切りごと: 確保済み 1、競合 1',
    )
    await expect(
      within(conflictPanel(canvasElement)).getByRole('heading', {
        name: '録画が重なっています',
      }),
    ).toBeVisible()

    await startPicking(canvas)
    await userEvent.click(
      within(relay).getByRole('checkbox', {
        name: '湾岸杯 野球 決勝 の表示中の区切り 2 つを選ぶ',
      }),
    )
    await expect(within(chosenBar(canvas)).getByText('2')).toBeVisible()
  },
}

export const 同じ放送の予約があるため取り消した予約: Story = {
  args: {
    result: shown(SAME_BROADCAST_FIXTURES, { filter: { show: 'all' } }),
  },
  play: async ({ canvasElement }) => {
    await afterTheArrival(canvasElement)

    const canvas = within(canvasElement)
    const same = rowOf(canvas, '世界の車窓紀行')
    const byHand = rowOf(canvas, '朝のニュース')

    await expect(chipsOf(same)).toHaveTextContent('重複取消')
    await expect(await tipIn(chipsOf(same))).toHaveTextContent(
      '同じ放送の予約が別にあるため取り消された予約。',
    )
    await expect(
      within(same).getByRole('button', { name: '復元' }),
    ).toBeEnabled()
    await expect(chipsOf(byHand)).toHaveTextContent('取消済み')
  },
}

const A_LONG_RULE_NAME =
  '毎週の深夜アニメの新番組の第一話だけを録って、学習に使い終えたら動画を消しておく'

const LONG_ORIGIN_FIXTURES: Reservation[] = RESERVATION_FIXTURES.map((one) => ({
  ...one,
  origin: 'ルール',
  ruleName: A_LONG_RULE_NAME,
}))

async function theOriginStaysOnItsLine(
  canvasElement: HTMLElement,
): Promise<void> {
  await afterTheArrival(canvasElement)

  const rows = [
    ...listOf(canvasElement).querySelectorAll<HTMLElement>(
      'li[data-reservation] > div',
    ),
  ]

  await expect(rows.length).toBeGreaterThan(1)

  for (const row of rows) {
    const line = [...row.querySelectorAll<HTMLElement>('span.truncate')].find(
      (one) => one.textContent?.includes(A_LONG_RULE_NAME),
    )!
    const said = line.getBoundingClientRect()
    const end = row.lastElementChild!.getBoundingClientRect()

    await expect(said.right).toBeLessThanOrEqual(end.left)
    await expect(Math.round(said.height)).toBe(
      Math.round(parseFloat(getComputedStyle(line).lineHeight)),
    )
  }
}

export const 長い由来: Story = {
  args: { result: shown(LONG_ORIGIN_FIXTURES) },
  play: async ({ canvasElement }) => {
    await theOriginStaysOnItsLine(canvasElement)
  },
}

export const 狭い幅での長い由来: Story = {
  args: { result: shown(LONG_ORIGIN_FIXTURES) },
  parameters: { screen: { width: 1180, height: 820 } },
  play: async ({ canvasElement }) => {
    await theOriginStaysOnItsLine(canvasElement)
  },
}

const raised: [string, number][] = []
const cancelledHere: string[] = []

function phoneList(canvasElement: HTMLElement): HTMLElement {
  const found = canvasElement.querySelector<HTMLElement>(
    '[data-slot="phone-reservation-rows"]',
  )

  if (!found) {
    throw new Error('the phone list is not drawn')
  }

  return found
}

export const 電話の幅では時刻の列の行を日付で区切って並べる: Story = {
  args: { result: shown(RESERVATION_FIXTURES) },
  parameters: { screen: PHONE },
  play: async ({ canvasElement }) => {
    await afterTheArrival(canvasElement)

    const list = await waitFor(() => phoneList(canvasElement))

    await expect(
      canvasElement.querySelector('[data-slot="reservations-columns"]'),
    ).not.toBeVisible()
    await expect(list.getBoundingClientRect().width).toBe(window.innerWidth)

    const [first] = RESERVATION_FIXTURES.filter(
      (one) => !one.relay && one.standing === 'scheduled',
    )
    const row = within(
      list.querySelector<HTMLElement>(`[data-reservation="${first.id}"]`)!,
    )

    await expect(row.getByText(first.title)).toBeVisible()
    await expect(
      row.getByRole('button', { name: '取り消す' }).getBoundingClientRect()
        .width,
    ).toBeGreaterThanOrEqual(44)
    await expect(list.querySelectorAll('h2').length).toBeGreaterThan(0)
    await expect(
      within(
        canvasElement.querySelector<HTMLElement>('[data-slot="top-bar"]')!,
      ).getByRole('link', { name: '予約を追加' }),
    ).toHaveAttribute('href', '/guide')
  },
}

export const 電話の幅で競合を解く: Story = {
  args: {
    result: shown(RESERVATION_FIXTURES),
    actions: {
      onCancel: accept,
      onRestore: accept,
      onRaise: async (id: string, priority: number) => {
        raised.push([id, priority])

        return { state: 'ok' as const }
      },
      onRevise: accept,
      onDiscard: throwing,
    },
  },
  parameters: { screen: NARROW_PHONE },
  beforeEach: () => {
    raised.length = 0
  },
  play: async ({ canvasElement }) => {
    await afterTheArrival(canvasElement)

    const frame = await waitFor(() => {
      const found = canvasElement.querySelector<HTMLElement>(
        '[data-slot="phone-conflict"]',
      )

      expect(found).not.toBeNull()

      return found!
    })
    const list = phoneList(canvasElement)

    await expect(frame.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      list.getBoundingClientRect().top,
    )
    await expect(
      frame.querySelector('[data-slot="conflict-overlap"]'),
    ).not.toBeNull()

    const take = within(frame).getByRole('button', { name: 'こちらを録る' })

    await expect(take.getBoundingClientRect().right).toBeLessThanOrEqual(
      window.innerWidth,
    )
    await userEvent.click(take)
    await waitFor(() => expect(raised).toHaveLength(1))
    await expect(
      within(frame).getByRole('link', { name: 'チューナーへ' }),
    ).toHaveAttribute('href', '/settings/tuners')
  },
}

export const 電話の幅で行のばつで取り消し知らせで元に戻す: Story = {
  args: {
    result: shown(RESERVATION_FIXTURES),
    actions: {
      onCancel: async (id: string) => {
        cancelledHere.push(id)

        return { state: 'ok' as const }
      },
      onRestore: accept,
      onRaise: accept,
      onRevise: accept,
      onDiscard: throwing,
    },
  },
  parameters: { screen: NARROW_PHONE },
  beforeEach: () => {
    cancelledHere.length = 0
  },
  play: async ({ canvasElement }) => {
    const list = await waitFor(() => phoneList(canvasElement))
    const [first] = RESERVATION_FIXTURES.filter(
      (one) => !one.relay && one.standing === 'scheduled',
    )
    const row = within(
      list.querySelector<HTMLElement>(`[data-reservation="${first.id}"]`)!,
    )

    await userEvent.click(row.getByRole('button', { name: '取り消す' }))
    await waitFor(() => expect(cancelledHere).toEqual([first.id]))

    const toast = await waitFor(() => {
      const found = canvasElement.querySelector<HTMLElement>(
        '[data-slot="toast"]',
      )

      expect(found).not.toBeNull()

      return found!
    })

    await userEvent.click(
      within(toast).getByRole('button', { name: '元に戻す' }),
    )
    await expect(canvasElement.querySelector('[data-slot="toast"]')).toBeNull()

    await userEvent.click(
      row.getByRole('button', { name: new RegExp(first.title) }),
    )
    await expect(
      list.querySelector('[data-slot="reservation-change"]'),
    ).not.toBeNull()
  },
}

export const 幅600pxからは広い画面の一覧: Story = {
  args: { result: shown(RESERVATION_FIXTURES) },
  parameters: { screen: FROM_600 },
  play: async ({ canvasElement }) => {
    await expect(listOf(canvasElement)).toBeVisible()
    await expect(
      canvasElement.querySelector('[data-slot="phone-reservation-rows"]'),
    ).toBeNull()

    const side = within(canvasElement).getByRole('complementary', {
      name: '競合と次の録画',
    })

    await expect(side.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      listOf(canvasElement).getBoundingClientRect().top,
    )
    await expect(within(canvasElement).queryByText('すべて選ぶ')).toBeNull()
  },
}

export const 横向きの電話は予約の一覧と競合を左右に置き押した予約を右で変える: Story =
  {
    args: { result: shown(RESERVATION_FIXTURES) },
    parameters: { screen: { width: 844, height: 390 }, coarse: true },
    play: async ({ canvasElement }) => {
      const canvas = within(canvasElement)
      const bar = canvasElement.querySelector<HTMLElement>(
        '[data-slot="top-bar"]',
      )!

      await expect(
        within(bar).getByRole('link', { name: 'ルール' }),
      ).toBeVisible()
      await expect(
        within(bar).getByRole('link', { name: '予約を追加' }),
      ).toBeVisible()

      const beside = await canvas.findByRole('region', { name: '予約の詳細' })

      await expect(
        beside.querySelector('[data-slot="phone-conflict"]'),
      ).not.toBeNull()

      const row = canvasElement.querySelector<HTMLElement>(
        '[data-pane="list"] li[data-reservation]',
      )!

      await userEvent.click(within(row).getAllByRole('button')[0])
      await waitFor(() => expect(row).toHaveAttribute('data-chosen'))
      await expect(
        beside.querySelector('[data-slot="reservation-beside"]'),
      ).not.toBeNull()
      await expect(row.textContent).toContain(
        within(beside).getAllByRole('heading', { level: 2 })[0].textContent,
      )
    },
  }
