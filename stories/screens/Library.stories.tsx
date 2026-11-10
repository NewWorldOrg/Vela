import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'
import { getRouter } from '@storybook/nextjs/navigation.mock'

import type {
  Recording,
  ThumbnailRemakes,
  RecordingBatch,
  RecordingDiscarded,
} from '@/repository/recordings'
import type { EncodeStanding } from '@/repository/encode-terms'
import {
  MORE_RECORDINGS_THAN_FIT,
  RECORDING_FIXTURES,
} from '@/stories/fixtures/recordings'
import { inProgressFirst } from '@/lib/recordings'
import { LibraryView } from '@/components/library/library-page'
import { LIBRARY_LAYOUT_COOKIE } from '@/lib/library-view'
import { cookieIn, forgettingCookie } from '@/lib/stored-flag'
import { heightOf } from '@/stories/pills-in-a-column'
import { afterTheArrival } from '@/stories/after-the-arrival'
import { scrollsInsideWithItsHeaderHeld } from '@/stories/scrolls-inside'
import { inTheApp } from '@/stories/frames'
import { LIBRARY_SHELF } from '@/stories/fixtures/library-shelf'
import { FROM_600, NARROW_PHONE, PHONE } from '@/stories/rows-as-cards'

const asked: string[] = []

async function throwing(id: string): Promise<RecordingDiscarded> {
  asked.push(id)

  return { state: 'ok', filesRemoved: 1 }
}

const STILL_RECORDING =
  'この録画はまだ書き込み中のため、削除できませんでした。録画を止めてから削除してください。'

const all = inProgressFirst(
  [...RECORDING_FIXTURES].sort(
    (a, b) =>
      (b.startedAt ?? '').localeCompare(a.startedAt ?? '') ||
      b.id.localeCompare(a.id, undefined, { numeric: true }),
  ),
)

function resultOf(items: Recording[]) {
  return {
    items,
    total: items.length,
    channels: [...new Set(items.map((r) => r.channel))],
    years: [...new Set(items.map((r) => r.year))].sort((a, b) => b - a),
    genres: [
      ...new Set(items.map((r) => r.genre).filter((g) => g !== undefined)),
    ],
    filter: {},
  }
}

const result = resultOf(all)

const thrownAway: string[][] = []

async function throwingAway(ids: string[]): Promise<RecordingBatch> {
  thrownAway.push(ids)

  return { state: 'ok', done: ids.length }
}

const remade: string[][] = []

async function remaking(ids: string[]): Promise<ThumbnailRemakes> {
  remade.push(ids)

  return {
    state: 'ok',
    items: ids.map((id) => ({ id, outcome: 'queued' })),
  }
}

const STILL_RECORDING_SAID =
  '録画中のため、サムネイルを再生成できませんでした。'

/** Queues every picked recording but the second, which is said to be still recording. */
async function remakingAllButTheSecond(
  ids: string[],
): Promise<ThumbnailRemakes> {
  remade.push(ids)

  return {
    state: 'ok',
    items: ids.map((id, at) =>
      at === 1
        ? { id, outcome: 'stillRecording', reason: STILL_RECORDING_SAID }
        : { id, outcome: 'queued' },
    ),
  }
}

const meta = {
  title: 'Screens/ライブラリ/ライブラリ',
  component: LibraryView,
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/library' } },
    layout: 'fullscreen',
  },
  args: {
    onDelete: throwing,
    onDeleteAll: throwingAway,
    onRemakeThumbnails: remaking,
    view: { by: 'date', as: 'table' },
  },
  decorators: [inTheApp],
} satisfies Meta<typeof LibraryView>

export default meta
type Story = StoryObj<typeof meta>

const GRID = { by: 'date', as: 'grid' } as const

const TABLE = { by: 'date', as: 'table' } as const

function drawnOf<T extends HTMLElement>(found: T[]): T {
  const drawn = found.find((one) => one.getBoundingClientRect().width > 0)

  if (!drawn) {
    throw new Error('none of them is drawn')
  }

  return drawn
}

async function startChoosing(canvasElement: HTMLElement) {
  await userEvent.click(
    drawnOf(within(canvasElement).getAllByRole('button', { name: '選ぶ' })),
  )
}

/** Opens a row's menu and hands back its 削除. */
async function deleteIn(row: HTMLElement): Promise<HTMLElement> {
  await userEvent.click(
    within(row).getByRole('button', { name: 'この録画の操作' }),
  )

  return await screen.findByRole('menuitem', { name: '削除' })
}

async function closeMenu() {
  await userEvent.keyboard('{Escape}')
  await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
}

function rowNamed(canvasElement: HTMLElement, name: RegExp): HTMLElement {
  return within(canvasElement).getByRole('row', { name })
}

/** The bar that floats at the window's foot while choosing, or the band over a phone's tabs. */
function pickingRow(canvasElement: HTMLElement): HTMLElement {
  return within(canvasElement).getByRole('toolbar', {
    name: '選んだ録画の操作',
  })
}

/** The mark that takes a recording in, on whichever list the width draws. */
function pickOf(canvasElement: HTMLElement, recording: Recording) {
  const holder = drawnOf([
    ...canvasElement.querySelectorAll<HTMLElement>(
      `[data-recording="${recording.id}"]`,
    ),
  ])

  return within(holder).getByRole('checkbox', {
    name: `${recording.title} を選ぶ`,
  })
}

function placeOf(canvasElement: HTMLElement, recording: Recording) {
  return drawnOf([
    ...canvasElement.querySelectorAll<HTMLElement>(
      `[data-recording="${recording.id}"]`,
    ),
  ])
}

/** Presses with Shift held, as a pointer on a desk does to take in a range. */
async function pressWithShift(target: HTMLElement) {
  const user = userEvent.setup()

  await user.keyboard('{Shift>}')
  await user.click(target)
  await user.keyboard('{/Shift}')
}

const A_DESKTOP = { width: 1440, height: 900 }

/** The picture of a recording, where a pointer comes to rest over it. */
function pictureOf(canvasElement: HTMLElement, recording: Recording) {
  return placeOf(canvasElement, recording).querySelector<HTMLElement>(
    '[data-thumbnail]',
  )!
}

/** Rests the pointer on a recording's picture. */
async function hoverOn(canvasElement: HTMLElement, recording: Recording) {
  await userEvent.hover(pictureOf(canvasElement, recording))
}

/** Whether a control is there to see: drawn, and not faded out. */
function shownOf(control: HTMLElement): boolean {
  return (
    control.getBoundingClientRect().width > 0 &&
    getComputedStyle(control).opacity === '1'
  )
}

/** Starts choosing as a mouse does: rests on a recording and presses the check that comes up on its picture. */
async function startWithTheCheck(
  canvasElement: HTMLElement,
  recording: Recording,
) {
  await hoverOn(canvasElement, recording)
  await waitFor(() =>
    expect(shownOf(pickOf(canvasElement, recording))).toBe(true),
  )
  await userEvent.click(pickOf(canvasElement, recording))
  await expect(pickOf(canvasElement, recording)).toBeChecked()
}

function topOf(element: Element | null): number {
  if (!element) {
    throw new Error('not drawn')
  }

  return Math.round(element.getBoundingClientRect().top)
}

export const 通常: Story = {
  args: { result, filter: {} },
  play: async ({ canvasElement }) => {
    await afterTheArrival(canvasElement)

    asked.length = 0

    await expect(
      await deleteIn(rowNamed(canvasElement, /夜ふかしラジオ倶楽部/)),
    ).toHaveAttribute('aria-disabled', 'true')
    await closeMenu()

    await expect(
      rowNamed(canvasElement, /波止場のブラスバンド/),
    ).toHaveTextContent('未解除')

    await expect(
      within(canvasElement).queryAllByRole('button', { name: '再生' }),
    ).toEqual([])

    await userEvent.click(
      await deleteIn(rowNamed(canvasElement, /週末キッチンの手帖/)),
    )

    const dialog = within(await screen.findByRole('alertdialog'))

    await afterTheArrival(canvasElement)
    await expect(dialog.getByText('/srv/recordings/1274.m2ts')).toBeVisible()
    await expect(dialog.getByText(/GB/)).toHaveTextContent(
      '3.4 GB (観測 08/09 23:31)',
    )
    await expect(asked).toEqual([])

    await userEvent.click(dialog.getByRole('button', { name: '削除する' }))
    await waitFor(() => expect(asked).toEqual(['1274']))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  },
}

export const 削除を断られたとき: Story = {
  args: {
    result,
    filter: {},
    onDelete: async (): Promise<RecordingDiscarded> => ({
      state: 'rejected',
      message: STILL_RECORDING,
    }),
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      await deleteIn(rowNamed(canvasElement, /週末キッチンの手帖/)),
    )

    const dialog = within(await screen.findByRole('alertdialog'))

    await afterTheArrival(canvasElement)

    await userEvent.click(dialog.getByRole('button', { name: '削除する' }))
    await expect(await dialog.findByText(STILL_RECORDING)).toBeVisible()
    await expect(screen.getByRole('alertdialog')).toBeVisible()
  },
}

export const 閉じる途中も削除の対象を描く: Story = {
  args: {
    result,
    filter: {},
    onDelete: async (): Promise<RecordingDiscarded> => ({
      state: 'rejected',
      message: STILL_RECORDING,
    }),
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      await deleteIn(rowNamed(canvasElement, /週末キッチンの手帖/)),
    )

    const face = await screen.findByRole('alertdialog')

    await afterTheArrival(canvasElement)
    await userEvent.click(
      within(face).getByRole('button', { name: '削除する' }),
    )
    await within(face).findByText(STILL_RECORDING)
    await userEvent.click(
      within(face).getByRole('button', { name: 'キャンセル' }),
    )

    await expect(face).toHaveAttribute('data-state', 'closed')
    await expect(face).toHaveTextContent('週末キッチンの手帖')
    await expect(face).toHaveTextContent(STILL_RECORDING)

    await afterTheArrival(canvasElement)
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  },
}

const STANDINGS: EncodeStanding[] = [
  'notEncoded',
  'queued',
  'running',
  'completed',
  'failed',
]

const ENDED = all.filter((r) => r.outcome !== 'recording')

const ENDED_BADLY = all.filter(
  (r) => r.outcome === 'truncated' || r.outcome === 'failed',
)

const KEPT = all.filter((r) => r.outcome === 'complete' && !r.fileMissing)

const GONE = all.filter((r) => r.fileMissing)

const LEFT_SCRAMBLED = {
  ...all.find((r) => r.title === '波止場のブラスバンド')!,
  leftScrambled: true,
  outcomeDetail: 'スクランブル解除失敗',
}

const DESCRAMBLED = {
  ...all.find((r) => r.title === '手仕事の地図')!,
  leftScrambled: false,
}

const CARRIED_ON_AFTER_A_GAP = {
  ...all.find((r) => r.title === '手仕事の地図')!,
  gap: { label: '欠け 3.8 秒', detail: '欠け 22:10 から 3.8 秒' },
}

/** The chips a row says in its state, wherever the width puts them. */
function stateIn(row: HTMLElement): string[] {
  const chips = [
    ...row.querySelectorAll<HTMLElement>('[data-slot="attention"]'),
  ]

  return [
    ...drawnOf(chips).querySelectorAll<HTMLElement>('[data-variant]'),
  ].map((one) => one.textContent?.trim() ?? '')
}

function rowsOf(canvasElement: HTMLElement): HTMLElement[] {
  return within(canvasElement)
    .getAllByRole('row')
    .filter((one) => one.querySelector('td'))
}

export const エンコードの5状態: Story = {
  args: {
    result: resultOf(
      STANDINGS.map((encode, nth) => ({ ...all[nth + 1], encode })),
    ),
    filter: {},
  },
  play: async ({ canvasElement }) => {
    const rows = await waitFor(() => rowsOf(canvasElement))
    const said = rows.map((row) =>
      row.querySelector('[data-slot="attention"]')
        ? stateIn(row).filter((one) => one.startsWith('エンコード'))
        : [],
    )

    await expect(said).toEqual([
      [],
      ['エンコード待ち'],
      ['エンコード中'],
      [],
      ['エンコード失敗'],
    ])
  },
}

export const エンコードのない一覧: Story = {
  args: {
    result: resultOf(
      all.map((r) => ({ ...r, encode: 'notEncoded' as EncodeStanding })),
    ),
    filter: {},
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => rowsOf(canvasElement))
    await expect(canvasElement).not.toHaveTextContent(
      /エンコード(待ち|中|失敗)/,
    )
  },
}

export const 自動実行が飛ばした録画: Story = {
  args: {
    result: resultOf([
      { ...all[1], encode: 'notEncoded', encodeWhenRecorded: false },
      { ...all[2], encode: 'notEncoded', encodeWhenRecorded: true },
      { ...all[3], encode: 'queued', encodeWhenRecorded: false },
    ]),
    filter: {},
  },
  play: async ({ canvasElement }) => {
    const rows = await waitFor(() => rowsOf(canvasElement))

    await expect(rows).toHaveLength(3)
    await expect(stateIn(rows[2])).toContain('エンコード待ち')
  },
}

export const 削除未完了の録画: Story = {
  args: {
    result: resultOf([
      { ...ENDED[0], unfinishedDeletion: undefined },
      { ...ENDED[1], unfinishedDeletion: {} },
      { ...ENDED[2], unfinishedDeletion: { filesLeft: 2 } },
    ]),
    filter: {},
  },
  play: async ({ canvasElement }) => {
    const rows = await waitFor(() => rowsOf(canvasElement))

    await expect(rows[1]).toHaveTextContent('削除未完了')
    await expect(rows[2]).toHaveTextContent('削除未完了')
    await expect(await deleteIn(rows[2])).not.toHaveAttribute('aria-disabled')
    await closeMenu()
  },
}

export const 全件未計測: Story = {
  args: {
    result: resultOf(
      all
        .filter((r) => r.outcome !== 'recording')
        .map((r) => ({
          ...r,
          quality: { measured: false },
          leftScrambled: false,
          encode: 'queued' as EncodeStanding,
        })),
    ),
    filter: {},
  },
  play: async ({ canvasElement }) => {
    for (const row of await waitFor(() => rowsOf(canvasElement))) {
      await expect(stateIn(row)).toContain('エンコード待ち')
    }
  },
}

export const 尻切れと失敗の録画: Story = {
  args: { result: resultOf(ENDED_BADLY), filter: {} },
  play: async ({ canvasElement }) => {
    const rows = await waitFor(() => rowsOf(canvasElement))

    await expect(rows).toHaveLength(ENDED_BADLY.length)

    for (const row of rows) {
      await expect(stateIn(row).length).toBeGreaterThan(0)
      await expect(await deleteIn(row)).not.toHaveAttribute('aria-disabled')
      await closeMenu()
    }
  },
}

export const ファイル不在の録画: Story = {
  args: { result: resultOf([KEPT[0], ...GONE]), filter: {} },
  play: async ({ canvasElement }) => {
    const [kept, ...gone] = await waitFor(() => rowsOf(canvasElement))

    await expect(kept.querySelector('[data-slot="attention"]')).toBeNull()

    for (const row of gone) {
      await expect(stateIn(row).length).toBeGreaterThan(0)
    }
  },
}

export const スクランブルが解けずに残った録画: Story = {
  args: { result: resultOf([LEFT_SCRAMBLED, DESCRAMBLED]), filter: {} },
  play: async ({ canvasElement }) => {
    const scrambled = rowNamed(canvasElement, /波止場のブラスバンド/)
    const descrambled = rowNamed(canvasElement, /手仕事の地図/)

    await expect(stateIn(scrambled)).toContain('未解除')
    await expect(descrambled).not.toHaveTextContent('未解除')
  },
}

export const 欠けのある録画: Story = {
  args: {
    result: resultOf([CARRIED_ON_AFTER_A_GAP, LEFT_SCRAMBLED]),
    filter: {},
  },
  play: async ({ canvasElement }) => {
    await expect(stateIn(rowNamed(canvasElement, /手仕事の地図/))).toContain(
      '欠け 3.8 秒',
    )
  },
}

export const 検索0件: Story = {
  args: {
    result: { ...result, items: [], filter: { q: '該当なし' } },
    filter: { q: '該当なし' },
  },
}

export const 録画0件: Story = {
  args: {
    result: { ...result, items: [], total: 0, filter: {} },
    filter: {},
  },
}

export const 観測時刻のない録画の削除: Story = {
  args: {
    result: {
      ...result,
      items: [{ ...all[1], sizeObservedAt: undefined, fileMissing: false }],
    },
    filter: {},
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(await deleteIn(rowsOf(canvasElement)[0]))

    const dialog = within(await screen.findByRole('alertdialog'))

    await afterTheArrival(canvasElement)
    const size = dialog.getByText(/GB/)

    await expect(size).toHaveTextContent('3.4 GB')
    await expect(size.textContent).not.toContain('(')
  },
}

export const 実ファイルのない録画の削除: Story = {
  args: {
    result: {
      ...result,
      items: [{ ...all[1], sizeObservedAt: undefined, fileMissing: true }],
    },
    filter: {},
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(await deleteIn(rowsOf(canvasElement)[0]))

    await expect(
      within(await screen.findByRole('alertdialog')).getByText(/GB/),
    ).toHaveTextContent('3.4 GB (実ファイルなし)')
  },
}

export const スクランブルが解けずに残った録画の削除: Story = {
  args: { result: resultOf([LEFT_SCRAMBLED]), filter: {} },
  play: async ({ canvasElement }) => {
    await userEvent.click(await deleteIn(rowsOf(canvasElement)[0]))

    const dialog = within(await screen.findByRole('alertdialog'))
    const said = dialog
      .getByText('結果と品質')
      .nextElementSibling?.querySelectorAll('[data-variant]')

    await expect(
      [...(said ?? [])].map((badge) => badge.textContent?.trim()),
    ).toEqual(['完全', '未解除'])
    await expect(dialog.getByText('未解除')).toHaveAttribute(
      'data-variant',
      'err',
    )
  },
}

export const 収まらないほどの録画: Story = {
  args: { result: resultOf(MORE_RECORDINGS_THAN_FIT), filter: {} },
  play: async ({ canvasElement }) => {
    await scrollsInsideWithItsHeaderHeld(canvasElement, '番組', {
      pageStays: true,
    })
  },
}

const LONG_AND_SHORT: Recording[] = [
  {
    ...ENDED[0],
    encode: 'notEncoded',
    encodeWhenRecorded: false,
    quality: { measured: true, level: 'good', detail: 'ドロップ 0' },
    fileMissing: false,
    unfinishedDeletion: undefined,
  },
  {
    ...ENDED[1],
    encode: 'completed',
    quality: {
      measured: true,
      level: 'mayNotBeWatchable',
      detail: 'ドロップ 0 / スクランブル残存 5,042,768',
    },
    fileMissing: false,
    unfinishedDeletion: undefined,
  },
  {
    ...ENDED[2],
    encode: 'running',
    quality: { measured: false },
    fileMissing: true,
    unfinishedDeletion: undefined,
  },
  {
    ...ENDED[3],
    encode: 'queued',
    quality: { measured: true, level: 'warning' },
    fileMissing: false,
    unfinishedDeletion: { filesLeft: 2 },
  },
]

export const 札の並び: Story = {
  args: { result: resultOf(LONG_AND_SHORT), filter: {} },
  play: async ({ canvasElement }) => {
    const rows = rowsOf(canvasElement)

    await expect(rows.length).toBe(LONG_AND_SHORT.length)

    for (const row of rows) {
      const chips = row.querySelector<HTMLElement>('[data-slot="attention"]')

      if (!chips) {
        continue
      }

      const tops = [
        ...drawnOf([
          ...row.querySelectorAll<HTMLElement>('[data-slot="attention"]'),
        ]).children,
      ].map((one) => Math.round(one.getBoundingClientRect().top))

      await expect(new Set(tops).size).toBe(1)
      await expect(heightOf(row)).toBe(70)
    }
  },
}

export const 現れ方: Story = {
  args: { result, filter: {} },
  play: async ({ canvasElement }) => {
    const rows = within(canvasElement).getAllByRole('row').slice(1)

    await expect(rows.length).toBeGreaterThan(6)

    for (const [nth, row] of rows.slice(0, 6).entries()) {
      const drawn = getComputedStyle(row)

      await expect(drawn.animationName).toBe('row')
      await expect(drawn.animationDuration).toBe('0.32s')
      await expect(Number.parseFloat(drawn.animationDelay)).toBeCloseTo(
        nth * 0.04,
        3,
      )
    }

    await expect(
      Number.parseFloat(getComputedStyle(rows[6]).animationDelay),
    ).toBeCloseTo(0.2, 3)

    document.documentElement.classList.add('dark')

    try {
      await expect(getComputedStyle(rows[0]).animationName).toBe('row')
    } finally {
      document.documentElement.classList.remove('dark')
    }
  },
}

export const 絞りの帯: Story = {
  args: { result: resultOf(LONG_AND_SHORT), filter: {} },
  parameters: { screen: { width: 1440, height: 900 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const genres = canvas.getByRole('group', { name: 'ジャンル' })
    const every = within(genres).getByRole('button', { name: 'すべて' })
    const pills = [
      ...within(genres).getAllByRole('button'),
      ...canvas
        .getAllByRole('combobox')
        .filter((one) => one.getBoundingClientRect().width > 0),
    ]

    await expect(pills.length).toBeGreaterThan(4)
    await expect(new Set(pills.map(heightOf)).size).toBe(1)
    await expect(
      new Set(pills.map((one) => getComputedStyle(one).fontSize)).size,
    ).toBe(1)
    await expect(every).toHaveAttribute('aria-pressed', 'true')
    await expect(
      drawnOf(canvas.getAllByPlaceholderText('番組名・概要・出演者で検索')),
    ).toBeVisible()
  },
}

const shelf = resultOf(LIBRARY_SHELF)

export const 日付の格子: Story = {
  args: { result: shelf, filter: {}, view: GRID },
  parameters: { screen: A_DESKTOP },
  play: async ({ canvasElement }) => {
    const going = await waitFor(() => {
      const found = canvasElement.querySelector<HTMLElement>(
        '[data-slot="continue-row"]',
      )

      expect(found).not.toBeNull()

      return found!
    })
    const shown = [...going.querySelectorAll('li')].filter(
      (one) => one.getBoundingClientRect().width > 0,
    )

    await expect(shown).toHaveLength(4)
    await expect(within(shown[0]).getByRole('link')).toHaveAttribute(
      'href',
      '/recordings/2098?play=1',
    )

    const grid = canvasElement.querySelector<HTMLElement>(
      '[data-slot="date-grid"]',
    )!
    const tiles = [...grid.querySelectorAll<HTMLElement>(':scope > li')]

    await expect(tiles).toHaveLength(LIBRARY_SHELF.length)
    await expect(
      new Set(tiles.map((one) => Math.round(one.getBoundingClientRect().top)))
        .size,
    ).toBe(2)
    await expect(
      grid.querySelectorAll('[data-slot="unwatched-dot"]'),
    ).toHaveLength(
      LIBRARY_SHELF.filter((one) => one.watchedSec === undefined).length,
    )
    await expect(within(tiles[0]).getByRole('link')).toHaveAttribute(
      'href',
      '/recordings/2101',
    )
    await expect(tiles[4].querySelector('p')).toHaveClass('invisible')
    await expect(
      tiles[3].querySelector('[data-slot="watched-bar"]'),
    ).not.toBeNull()
  },
}

export const シリーズ: Story = {
  args: {
    result: shelf,
    filter: {},
    view: { by: 'series', as: 'grid' },
  },
  parameters: { screen: A_DESKTOP },
  play: async ({ canvasElement }) => {
    const grid = await waitFor(() => {
      const found = canvasElement.querySelector<HTMLElement>(
        '[data-slot="series-grid"]',
      )

      expect(found).not.toBeNull()

      return found!
    })
    const cards = within(grid).getAllByRole('button', { expanded: false })
    const open = within(grid).getByRole('button', { expanded: true })

    await expect(open).toHaveTextContent('となりの発明王')
    await expect(open).toHaveTextContent('7 話')
    await expect(open).toHaveTextContent('未視聴 3')
    await expect(cards).toHaveLength(2)

    const episodes = grid.querySelector<HTMLElement>(
      '[data-slot="series-open"]',
    )!

    await expect(episodes.querySelectorAll('li')).toHaveLength(7)
    await expect(episodes).toHaveTextContent('「空飛ぶ傘の巻」')

    await userEvent.click(cards[1])
    await waitFor(() =>
      expect(
        grid.querySelector('[data-slot="series-open"]'),
      ).toHaveAccessibleName('国会の窓'),
    )
  },
}

export const 表: Story = {
  args: {
    result: shelf,
    filter: {},
    view: { by: 'date', as: 'table' },
  },
  parameters: { screen: A_DESKTOP },
  play: async ({ canvasElement }) => {
    const table = await waitFor(() => {
      const found = canvasElement.querySelector<HTMLElement>('table')

      expect(found).not.toBeNull()

      return found!
    })
    const going = canvasElement.querySelector<HTMLElement>(
      '[data-slot="continue-row"]',
    )!
    const resumes = [...going.querySelectorAll('li')].filter(
      (one) => one.getBoundingClientRect().width > 0,
    )

    await expect(resumes).toHaveLength(window.innerWidth >= 1300 ? 4 : 3)
    await expect(within(resumes[0]).getByRole('link')).toHaveAttribute(
      'href',
      '/recordings/2098?play=1',
    )
    await expect(going.getBoundingClientRect().bottom).toBeLessThan(
      table.getBoundingClientRect().top,
    )
    await expect(going.getBoundingClientRect().height).toBeLessThan(110)

    const sorted = within(table).getByRole('columnheader', {
      name: /録画日時/,
    })

    await expect(sorted).toHaveAttribute('aria-sort', 'descending')
    await expect(within(table).getAllByRole('row').length).toBe(
      LIBRARY_SHELF.length + 1,
    )
    await expect(table).toHaveTextContent('未視聴')
    await expect(table).toHaveTextContent('視聴済み')
    await expect(table).toHaveTextContent('40%')
    await expect(table).toHaveTextContent('欠け 3 秒')
  },
}

export const シリーズの表: Story = {
  args: {
    result: shelf,
    filter: {},
    view: { by: 'series', as: 'table' },
  },
  parameters: { screen: A_DESKTOP },
  play: async ({ canvasElement }) => {
    const table = await waitFor(() => {
      const found = canvasElement.querySelector<HTMLElement>('table')

      expect(found).not.toBeNull()

      return found!
    })

    await expect(
      within(table)
        .getAllByRole('rowheader')
        .map((one) => one.textContent),
    ).toEqual(['となりの発明王7 話', 'コメット急行2 話', '国会の窓3 話'])
  },
}

export const 並べ方を選ぶとこの端末に残る: Story = {
  args: { result, filter: {} },
  play: async ({ canvasElement }) => {
    document.cookie = forgettingCookie(LIBRARY_LAYOUT_COOKIE)
    await afterTheArrival(canvasElement)
    const layout = within(canvasElement).getByRole('group', { name: '並べ方' })

    await userEvent.click(within(layout).getByRole('link', { name: '表' }))
    await expect(cookieIn(document.cookie, LIBRARY_LAYOUT_COOKIE)).toBe('table')
    await expect(
      within(layout).getByRole('link', { name: '表' }),
    ).toHaveAttribute('href', expect.stringContaining('as=table'))

    await userEvent.click(within(layout).getByRole('link', { name: '格子' }))
    await expect(cookieIn(document.cookie, LIBRARY_LAYOUT_COOKIE)).toBe('grid')
    await expect(
      within(layout).getByRole('link', { name: '格子' }),
    ).toHaveAttribute('href', expect.stringContaining('as=grid'))

    document.cookie = forgettingCookie(LIBRARY_LAYOUT_COOKIE)
  },
}

export const 複数を選んでサムネイルを再生成する: Story = {
  args: { result, filter: {}, onRemakeThumbnails: remakingAllButTheSecond },
  parameters: { coarse: true },
  play: async ({ canvasElement }) => {
    await startChoosing(canvasElement)
    const [first, second] = result.items.filter(
      (one) => one.outcome !== 'recording',
    )

    remade.length = 0

    await userEvent.click(pickOf(canvasElement, first))
    await userEvent.click(pickOf(canvasElement, second))
    await expect(pickingRow(canvasElement)).toHaveTextContent('2 件を選択')

    await userEvent.click(
      within(pickingRow(canvasElement)).getByRole('button', {
        name: 'サムネイルを再生成',
      }),
    )

    await waitFor(() => expect(remade).toEqual([[first.id, second.id]]))
    await expect(
      await screen.findByText(
        '1 件のサムネイルを作り直します、1 件はできませんでした。',
      ),
    ).toBeVisible()
    await expect(pickingRow(canvasElement)).toHaveTextContent('1 件を選択')
    await expect(pickOf(canvasElement, first)).not.toBeChecked()
    await expect(pickOf(canvasElement, second)).toBeChecked()
    await expect(
      within(placeOf(canvasElement, second)).getByText(STILL_RECORDING_SAID),
    ).toBeVisible()
    await expect(
      within(placeOf(canvasElement, first)).queryByRole('status'),
    ).toBeNull()
  },
}

export const サムネイルがすべて再生成に回ると選ぶのをやめる: Story = {
  args: { result, filter: {} },
  parameters: { coarse: true },
  play: async ({ canvasElement }) => {
    await startChoosing(canvasElement)
    const [first] = result.items.filter((one) => one.outcome !== 'recording')

    remade.length = 0

    await userEvent.click(pickOf(canvasElement, first))
    await userEvent.click(
      within(pickingRow(canvasElement)).getByRole('button', {
        name: 'サムネイルを再生成',
      }),
    )

    await waitFor(() => expect(remade).toEqual([[first.id]]))
    await expect(
      await screen.findByText('1 件のサムネイルを作り直します。'),
    ).toBeVisible()
    await stopsChoosing(canvasElement)
  },
}

export const 録画中を選ぶとサムネイルの再生成も削除も押せない: Story = {
  args: { result, filter: {} },
  parameters: { coarse: true },
  play: async ({ canvasElement }) => {
    await startChoosing(canvasElement)
    const recording = result.items.find((one) => one.outcome === 'recording')!

    await userEvent.click(pickOf(canvasElement, recording))

    const row = within(pickingRow(canvasElement))

    await expect(
      row.getByRole('button', { name: 'サムネイルを再生成' }),
    ).toBeDisabled()
    await expect(row.getByRole('button', { name: '削除' })).toBeDisabled()
  },
}

export const 複数を選んで削除する: Story = {
  args: { result, filter: {} },
  parameters: { coarse: true },
  play: async ({ canvasElement }) => {
    await startChoosing(canvasElement)
    const [first, second] = result.items.filter(
      (one) => one.outcome !== 'recording',
    )

    thrownAway.length = 0

    await userEvent.click(pickOf(canvasElement, first))
    await userEvent.click(pickOf(canvasElement, second))
    await expect(pickingRow(canvasElement)).toHaveTextContent('2 件を選択')
    await expect(window.location.pathname).not.toMatch(/\/recordings\//)

    await userEvent.click(
      within(pickingRow(canvasElement)).getByRole('button', { name: '削除' }),
    )

    const dialog = within(await screen.findByRole('alertdialog'))

    await expect(dialog.getByText(first.title)).toBeVisible()
    await expect(dialog.getByText(second.title)).toBeVisible()
    await userEvent.click(dialog.getByRole('button', { name: '削除する' }))

    await waitFor(() => expect(thrownAway).toEqual([[first.id, second.id]]))
    await stopsChoosing(canvasElement)
  },
}

/** Sees the library leave choosing: the bar or band gone, no checks drawn, and `選ぶ` no longer pressed where it is drawn. */
async function stopsChoosing(canvasElement: HTMLElement): Promise<void> {
  const canvas = within(canvasElement)

  await waitFor(() => expect(canvas.queryByRole('toolbar')).toBeNull())
  await expect(canvas.queryAllByRole('checkbox', { checked: true })).toEqual([])
  for (const toggle of canvas.queryAllByRole('button', { name: '選ぶ' })) {
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  }
}

const BAR_ABOVE_THE_FOOT = 24

/** Where the bar stands once it has risen in: fixed, its foot 24px over the window's, in the middle of the window. */
async function floatsAtTheFoot(bar: HTMLElement): Promise<void> {
  const { clientWidth, clientHeight } = document.documentElement

  await expect(getComputedStyle(bar).position).toBe('fixed')
  await waitFor(() => {
    const box = bar.getBoundingClientRect()

    expect(
      Math.abs(clientHeight - box.bottom - BAR_ABOVE_THE_FOOT),
    ).toBeLessThan(1.5)
    expect(Math.abs(box.left - (clientWidth - box.right))).toBeLessThan(1.5)
  })
  await expect(getComputedStyle(bar).boxShadow).not.toBe('none')
}

export const 選ぶを押すと窓の下に選ぶ帯が浮かぶ: Story = {
  args: { result: resultOf(LIBRARY_SHELF), filter: {}, view: GRID },
  parameters: { screen: { width: 1440, height: 900 }, coarse: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await afterTheArrival(canvasElement)

    const genres = canvas.getByRole('group', { name: 'ジャンル' })
    const shelves = canvasElement.querySelector<HTMLElement>(
      '[data-slot="library-shelves"]',
    )!
    const heading = canvas.getByRole('heading', {
      level: 1,
      name: 'ライブラリ',
    })
    const filtersAt = topOf(genres)
    const shelvesAt = topOf(shelves)
    const headingAt = topOf(heading)

    await expect(canvas.queryByRole('toolbar')).toBeNull()
    await startChoosing(canvasElement)

    const bar = pickingRow(canvasElement)
    const row = within(bar)

    await floatsAtTheFoot(bar)
    await expect(row.getByText('録画を選ぶ')).toBeVisible()
    await expect(row.getByRole('button', { name: '閉じる' })).toBeVisible()
    await expect(row.getByRole('button', { name: 'すべて選ぶ' })).toBeVisible()
    await expect(row.getByRole('button', { name: '削除' })).toBeDisabled()

    await expect(
      canvas.getByRole('heading', { level: 1, name: 'ライブラリ' }),
    ).toBeVisible()
    await expect(topOf(heading)).toBe(headingAt)
    await expect(topOf(genres)).toBe(filtersAt)
    await expect(topOf(shelves)).toBe(shelvesAt)

    const pick = drawnOf(canvas.getAllByRole('button', { name: '選ぶ' }))

    await expect(pick).toHaveAttribute('aria-pressed', 'true')
    await expect(pick.className).toMatch(/\bbg-accent-tint\b/)

    const [first] = LIBRARY_SHELF

    await userEvent.click(pickOf(canvasElement, first))
    await expect(row.getByText('件を選択', { exact: false })).toHaveTextContent(
      '1 件を選択',
    )
    await expect(row.getByRole('button', { name: '削除' })).toBeEnabled()
    await floatsAtTheFoot(bar)
  },
}

export const 選ぶをもう一度押すか閉じるで帯が消える: Story = {
  args: { result: resultOf(LIBRARY_SHELF), filter: {}, view: GRID },
  parameters: { screen: { width: 1440, height: 900 }, coarse: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await afterTheArrival(canvasElement)

    const shelves = canvasElement.querySelector<HTMLElement>(
      '[data-slot="library-shelves"]',
    )!
    const shelvesAt = topOf(shelves)

    await startChoosing(canvasElement)
    await userEvent.click(pickOf(canvasElement, LIBRARY_SHELF[0]))

    const pick = drawnOf(canvas.getAllByRole('button', { name: '選ぶ' }))

    await userEvent.click(pick)
    await waitFor(() => expect(canvas.queryByRole('toolbar')).toBeNull())
    await expect(pick).toHaveAttribute('aria-pressed', 'false')
    await expect(canvas.queryAllByRole('checkbox')).toEqual([])
    await expect(topOf(shelves)).toBe(shelvesAt)

    await startChoosing(canvasElement)
    await userEvent.click(
      within(pickingRow(canvasElement)).getByRole('button', { name: '閉じる' }),
    )
    await waitFor(() => expect(canvas.queryByRole('toolbar')).toBeNull())
    await waitFor(() =>
      expect(
        canvasElement.querySelector('[data-slot="picking-bar"]'),
      ).toBeNull(),
    )
  },
}

/** Scrolls the list the recordings are in to its end, and sees the bar float where it did and the last recording clear of it. */
async function leavesTheLastOneClear(canvasElement: HTMLElement) {
  await startChoosing(canvasElement)

  const bar = pickingRow(canvasElement)
  const shelves = canvasElement.querySelector<HTMLElement>(
    '[data-slot="library-shelves"]',
  )!
  const last = [
    ...shelves.querySelectorAll<HTMLElement>('[data-recording]'),
  ].at(-1)!
  const scroller =
    last.closest<HTMLElement>('[data-slot="table-container"]') ?? shelves

  await expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight)
  await floatsAtTheFoot(bar)

  scroller.scrollTop = scroller.scrollHeight
  await waitFor(() =>
    expect(
      Math.abs(
        scroller.scrollTop + scroller.clientHeight - scroller.scrollHeight,
      ),
    ).toBeLessThan(2),
  )
  await floatsAtTheFoot(bar)
  await expect(last.getBoundingClientRect().bottom).toBeLessThanOrEqual(
    bar.getBoundingClientRect().top,
  )
}

export const 選ぶ帯はスクロールしても窓の下にとどまり最後の行を隠さない: Story =
  {
    args: {
      result: resultOf(MORE_RECORDINGS_THAN_FIT),
      filter: {},
      view: GRID,
    },
    parameters: { screen: { width: 1440, height: 900 }, coarse: true },
    play: async ({ canvasElement }) => {
      await leavesTheLastOneClear(canvasElement)
    },
  }

export const 表でも選ぶ帯は最後の行を隠さない: Story = {
  args: {
    result: resultOf(MORE_RECORDINGS_THAN_FIT),
    filter: {},
    view: TABLE,
  },
  parameters: { screen: { width: 1440, height: 900 }, coarse: true },
  play: async ({ canvasElement }) => {
    await leavesTheLastOneClear(canvasElement)
  },
}

export const すべて選ぶとすべて外す: Story = {
  args: { result: resultOf(LIBRARY_SHELF), filter: {}, view: GRID },
  parameters: { screen: { width: 1440, height: 900 }, coarse: true },
  play: async ({ canvasElement }) => {
    await startChoosing(canvasElement)

    const row = within(pickingRow(canvasElement))

    await userEvent.click(row.getByRole('button', { name: 'すべて選ぶ' }))
    await expect(pickingRow(canvasElement)).toHaveTextContent(
      `${LIBRARY_SHELF.length} 件を選択`,
    )
    for (const one of LIBRARY_SHELF) {
      await expect(pickOf(canvasElement, one)).toBeChecked()
    }

    await pressAndSinks(
      canvasElement,
      row.getByRole('button', { name: 'すべて外す' }),
    )
  },
}

const CARTOONS = LIBRARY_SHELF.filter(
  (one) => one.genre === LIBRARY_SHELF[0].genre,
)

export const すべて選ぶは絞り込みに従う: Story = {
  args: {
    result: { ...resultOf(CARTOONS), total: LIBRARY_SHELF.length },
    filter: { genre: LIBRARY_SHELF[0].genre },
    view: GRID,
  },
  parameters: { screen: { width: 1440, height: 900 }, coarse: true },
  play: async ({ canvasElement }) => {
    thrownAway.length = 0
    await expect(CARTOONS.length).toBeLessThan(LIBRARY_SHELF.length)
    await startChoosing(canvasElement)

    const row = within(pickingRow(canvasElement))

    await userEvent.click(row.getByRole('button', { name: 'すべて選ぶ' }))
    await expect(pickingRow(canvasElement)).toHaveTextContent(
      `${CARTOONS.length} 件を選択`,
    )
    await userEvent.click(row.getByRole('button', { name: '削除' }))
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: '削除する',
      }),
    )
    await waitFor(() =>
      expect(thrownAway).toEqual([CARTOONS.map((one) => one.id)]),
    )
  },
}

export const Shiftを押しながら押すと範囲で選ぶ: Story = {
  args: { result: resultOf(LIBRARY_SHELF), filter: {}, view: GRID },
  parameters: { screen: A_DESKTOP },
  play: async ({ canvasElement }) => {
    const [, second, third, fourth, fifth] = LIBRARY_SHELF

    await startWithTheCheck(canvasElement, second)
    await pressWithShift(pickOf(canvasElement, fifth))

    await expect(pickingRow(canvasElement)).toHaveTextContent('4 件を選択')
    for (const one of [second, third, fourth, fifth]) {
      await expect(pickOf(canvasElement, one)).toBeChecked()
    }
    await expect(pickOf(canvasElement, LIBRARY_SHELF[0])).not.toBeChecked()
    await expect(document.getSelection()?.toString() ?? '').toBe('')
  },
}

export const 表でもShiftで範囲を選ぶ: Story = {
  args: { result: resultOf(LIBRARY_SHELF), filter: {}, view: TABLE },
  parameters: { screen: A_DESKTOP },
  play: async ({ canvasElement }) => {
    const [first, , third] = LIBRARY_SHELF

    await startWithTheCheck(canvasElement, third)
    await pressWithShift(placeOf(canvasElement, first))

    await expect(pickingRow(canvasElement)).toHaveTextContent('3 件を選択')
  },
}

export const Escで選ぶのをやめる: Story = {
  args: { result: resultOf(LIBRARY_SHELF), filter: {}, view: GRID },
  parameters: { screen: A_DESKTOP },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const [first] = LIBRARY_SHELF

    await startWithTheCheck(canvasElement, first)
    await userEvent.keyboard('{Escape}')

    await expect(canvas.queryByRole('toolbar')).toBeNull()
    await expect(canvas.queryAllByRole('checkbox', { checked: true })).toEqual(
      [],
    )
    await expect(pickOf(canvasElement, first)).toHaveFocus()

    await startWithTheCheck(canvasElement, first)
    await expect(pickingRow(canvasElement)).toHaveTextContent('1 件を選択')
  },
}

/** Takes the one recording in from its check and leaves it out again, and sees the library stop choosing with it. */
async function leavesTheOnlyOneOut(
  canvasElement: HTMLElement,
  recording: Recording,
) {
  await startWithTheCheck(canvasElement, recording)
  await expect(pickingRow(canvasElement)).toHaveTextContent('1 件を選択')

  await pressAndSinks(canvasElement, pickOf(canvasElement, recording))
  await expect(
    canvasElement.querySelector('[data-slot="pick-mark"][data-taken]'),
  ).toBeNull()
}

const SINKS_WITHIN = 500

/** Presses what leaves the last picked recording out, and sees the bar start sinking at once and be gone within half a second, saying what it said before all the while. */
async function pressAndSinks(
  canvasElement: HTMLElement,
  target: HTMLElement,
): Promise<void> {
  const barOf = () =>
    [
      ...canvasElement.querySelectorAll<HTMLElement>(
        '[data-slot="picking-bar"], [data-slot="picking-band"]',
      ),
    ].find((one) => one.getClientRects().length > 0)
  const before = barOf()?.textContent ?? ''
  const said = new Set<string>()
  let from = performance.now()
  let gone: number | undefined

  target.addEventListener(
    'click',
    () => {
      from = performance.now()
    },
    { once: true, capture: true },
  )
  await expect(before).toContain('件を選択')
  await userEvent.click(target)

  while (performance.now() - from < SINKS_WITHIN * 3) {
    const bar = barOf()

    if (!bar) {
      gone = performance.now() - from
      break
    }

    said.add(bar.textContent ?? '')
    await new Promise((tick) => setTimeout(tick, 10))
  }

  await expect(gone).toBeLessThan(SINKS_WITHIN)
  await expect([...said].filter((one) => one !== before)).toEqual([])
  await stopsChoosing(canvasElement)
}

export const 選んだ1件を外すと選ぶのをやめる: Story = {
  args: { result: resultOf(LIBRARY_SHELF), filter: {}, view: GRID },
  parameters: { screen: A_DESKTOP },
  play: async ({ canvasElement }) => {
    await leavesTheOnlyOneOut(canvasElement, LIBRARY_SHELF[0])
  },
}

export const 表でも選んだ1件を外すと選ぶのをやめる: Story = {
  args: { result: resultOf(LIBRARY_SHELF), filter: {}, view: TABLE },
  parameters: { screen: A_DESKTOP },
  play: async ({ canvasElement }) => {
    await leavesTheOnlyOneOut(canvasElement, LIBRARY_SHELF[1])
  },
}

export const 削除して0件になると選ぶのをやめる: Story = {
  args: { result: resultOf(LIBRARY_SHELF), filter: {}, view: GRID },
  parameters: { screen: A_DESKTOP },
  play: async ({ canvasElement }) => {
    const [first] = LIBRARY_SHELF

    thrownAway.length = 0
    await startWithTheCheck(canvasElement, first)
    await userEvent.click(
      within(pickingRow(canvasElement)).getByRole('button', { name: '削除' }),
    )
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: '削除する',
      }),
    )

    await waitFor(() => expect(thrownAway).toEqual([[first.id]]))
    await stopsChoosing(canvasElement)
  },
}

export const マウスの画面では上に選ぶが無く絵に乗せるとチェックが出る: Story = {
  args: { result: resultOf(LIBRARY_SHELF), filter: {}, view: GRID },
  parameters: { screen: A_DESKTOP },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const [first, second] = LIBRARY_SHELF

    await afterTheArrival(canvasElement)
    await expect(canvas.queryAllByRole('button', { name: '選ぶ' })).toEqual([])
    await expect(shownOf(pickOf(canvasElement, first))).toBe(false)

    await hoverOn(canvasElement, first)
    await waitFor(() =>
      expect(shownOf(pickOf(canvasElement, first))).toBe(true),
    )
    await expect(shownOf(pickOf(canvasElement, second))).toBe(false)
    await expect(pickOf(canvasElement, first)).not.toBeChecked()

    const mark = pickOf(canvasElement, first).getBoundingClientRect()
    const picture = placeOf(canvasElement, first)
      .querySelector('[data-thumbnail]')!
      .getBoundingClientRect()

    await expect(Math.round(mark.width)).toBe(22)
    await expect(mark.left - picture.left).toBeGreaterThan(0)
    await expect(mark.left - picture.left).toBeLessThan(16)
    await expect(mark.top - picture.top).toBeGreaterThan(0)
    await expect(mark.top - picture.top).toBeLessThan(16)

    await userEvent.unhover(pictureOf(canvasElement, first))
    await waitFor(() =>
      expect(shownOf(pickOf(canvasElement, first))).toBe(false),
    )
    await expect(canvas.queryByRole('toolbar')).toBeNull()
  },
}

export const マウスの画面ではチェックを押すと選び始めてその1件を選ぶ: Story = {
  args: { result: resultOf(LIBRARY_SHELF), filter: {}, view: GRID },
  parameters: { screen: A_DESKTOP },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const [first, second] = LIBRARY_SHELF

    await afterTheArrival(canvasElement)
    await startWithTheCheck(canvasElement, first)

    const bar = pickingRow(canvasElement)

    await floatsAtTheFoot(bar)
    await expect(bar).toHaveTextContent('1 件を選択')
    await expect(pickOf(canvasElement, first)).toBeChecked()
    await expect(pickOf(canvasElement, second)).not.toBeChecked()
    await expect(canvas.getAllByRole('checkbox')).toHaveLength(
      LIBRARY_SHELF.length,
    )
    for (const one of LIBRARY_SHELF) {
      await expect(shownOf(pickOf(canvasElement, one))).toBe(true)
    }

    await userEvent.click(pickOf(canvasElement, second))
    await expect(bar).toHaveTextContent('2 件を選択')

    await userEvent.click(pickOf(canvasElement, first))
    await expect(bar).toHaveTextContent('1 件を選択')

    await pressAndSinks(canvasElement, pickOf(canvasElement, second))
    await expect(pickOf(canvasElement, first)).toHaveFocus()
  },
}

export const 表ではマウスを乗せた行の絵にチェックが出る: Story = {
  args: { result: resultOf(LIBRARY_SHELF), filter: {}, view: TABLE },
  parameters: { screen: A_DESKTOP },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const [first, second] = LIBRARY_SHELF

    await afterTheArrival(canvasElement)
    await expect(canvas.queryAllByRole('button', { name: '選ぶ' })).toEqual([])
    await expect(shownOf(pickOf(canvasElement, first))).toBe(false)

    await hoverOn(canvasElement, first)
    await waitFor(() =>
      expect(shownOf(pickOf(canvasElement, first))).toBe(true),
    )
    await expect(shownOf(pickOf(canvasElement, second))).toBe(false)
    await expect(
      Math.round(pickOf(canvasElement, first).getBoundingClientRect().width),
    ).toBe(18)

    getRouter().push.mockClear()
    await userEvent.click(pickOf(canvasElement, first))
    await expect(pickingRow(canvasElement)).toHaveTextContent('1 件を選択')
    await expect(placeOf(canvasElement, first)).toHaveAttribute(
      'data-state',
      'selected',
    )
    await expect(canvas.getAllByRole('checkbox')).toHaveLength(
      LIBRARY_SHELF.length,
    )
    await expect(getRouter().push).not.toHaveBeenCalled()
  },
}

export const マウスの画面でチェック以外を押すと録画を開く: Story = {
  args: { result: resultOf(LIBRARY_SHELF), filter: {}, view: GRID },
  parameters: { screen: A_DESKTOP },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const [first] = LIBRARY_SHELF
    const link = within(placeOf(canvasElement, first)).getByRole('link')

    await afterTheArrival(canvasElement)
    await hoverOn(canvasElement, first)
    link.addEventListener('click', (event) => event.preventDefault(), {
      once: true,
    })

    let opened = false

    link.addEventListener('click', () => {
      opened = true
    })
    await userEvent.click(pictureOf(canvasElement, first))

    await expect(opened).toBe(true)
    await expect(link).toHaveAttribute('href', `/recordings/${first.id}`)
    await expect(canvas.queryByRole('toolbar')).toBeNull()
  },
}

export const 表でマウスの画面でチェック以外を押すと録画を開く: Story = {
  args: { result: resultOf(LIBRARY_SHELF), filter: {}, view: TABLE },
  parameters: { screen: A_DESKTOP },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const [first] = LIBRARY_SHELF
    const row = placeOf(canvasElement, first)

    await afterTheArrival(canvasElement)
    await hoverOn(canvasElement, first)
    getRouter().push.mockClear()
    await userEvent.click(within(row).getByText(first.channel))

    await expect(getRouter().push).toHaveBeenCalledWith(
      `/recordings/${first.id}`,
    )
    await expect(canvas.queryByRole('toolbar')).toBeNull()
  },
}

export const Tabでチェックに焦点が来ると見える: Story = {
  args: { result: resultOf(LIBRARY_SHELF), filter: {}, view: GRID },
  parameters: { screen: A_DESKTOP },
  play: async ({ canvasElement }) => {
    const [first] = LIBRARY_SHELF
    const link = within(placeOf(canvasElement, first)).getByRole('link')

    await afterTheArrival(canvasElement)
    link.focus()
    await userEvent.tab()

    const check = pickOf(canvasElement, first)

    await expect(check).toHaveFocus()
    await waitFor(() => expect(shownOf(check)).toBe(true))

    await userEvent.keyboard('{Enter}')
    await expect(pickingRow(canvasElement)).toHaveTextContent('1 件を選択')
    await expect(pickOf(canvasElement, first)).toBeChecked()
    await expect(pickOf(canvasElement, first)).toHaveFocus()
  },
}

export const 表では絵の上に印を置き列はずれない: Story = {
  args: { result: resultOf(LIBRARY_SHELF), filter: {}, view: TABLE },
  parameters: { screen: { width: 1440, height: 900 }, coarse: true },
  play: async ({ canvasElement }) => {
    await afterTheArrival(canvasElement)

    const table = await waitFor(() => within(canvasElement).getByRole('table'))
    const head = within(table).getByRole('columnheader', { name: '番組' })
    const thumb = table.querySelector('[data-thumbnail]')!
    const headAt = head.getBoundingClientRect().left
    const thumbAt = thumb.getBoundingClientRect().left
    const tableAt = topOf(table)

    await startChoosing(canvasElement)

    const [first] = LIBRARY_SHELF
    const mark = placeOf(canvasElement, first).querySelector(
      '[data-slot="pick-mark"]',
    )!
    const picture = placeOf(canvasElement, first)
      .querySelector('[data-thumbnail]')!
      .getBoundingClientRect()

    await expect(head.getBoundingClientRect().left).toBe(headAt)
    await expect(thumb.getBoundingClientRect().left).toBe(thumbAt)
    await expect(topOf(table)).toBe(tableAt)
    await expect(mark.getBoundingClientRect().left).toBeGreaterThan(
      picture.left,
    )
    await expect(mark.getBoundingClientRect().right).toBeLessThan(picture.right)

    await userEvent.click(pickOf(canvasElement, first))
    await expect(placeOf(canvasElement, first)).toHaveAttribute(
      'data-state',
      'selected',
    )
  },
}

export const 選ぶあいだ続きからは薄く押せない: Story = {
  args: { result: resultOf(LIBRARY_SHELF), filter: {}, view: GRID },
  parameters: { screen: { width: 1440, height: 900 }, coarse: true },
  play: async ({ canvasElement }) => {
    await afterTheArrival(canvasElement)

    const going = await waitFor(() => {
      const found = canvasElement.querySelector<HTMLElement>(
        '[data-slot="continue-row"]',
      )

      expect(found).not.toBeNull()

      return found!
    })

    await expect(getComputedStyle(going).opacity).toBe('1')
    await startChoosing(canvasElement)
    await waitFor(() => expect(getComputedStyle(going).opacity).toBe('0.4'))
    await expect(within(going).queryAllByRole('link')).toEqual([])
    await expect(going).toHaveTextContent(LIBRARY_SHELF[3].title)
  },
}

export const 録画中を含むと削除できない: Story = {
  args: { result, filter: {} },
  parameters: { coarse: true },
  play: async ({ canvasElement }) => {
    await startChoosing(canvasElement)
    const recording = result.items.find((one) => one.outcome === 'recording')

    await expect(recording).toBeDefined()

    const row = within(pickingRow(canvasElement))

    await userEvent.click(row.getByRole('button', { name: 'すべて選ぶ' }))
    await expect(pickingRow(canvasElement)).toHaveTextContent(
      `${result.items.length} 件を選択`,
    )
    await expect(row.getByRole('button', { name: '削除' })).toBeDisabled()
  },
}

export const 絞りを変えると選択を外す: Story = {
  args: { result, filter: {} },
  parameters: { coarse: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await startChoosing(canvasElement)
    const [first] = result.items

    await userEvent.click(pickOf(canvasElement, first))
    await expect(pickingRow(canvasElement)).toHaveTextContent('1 件を選択')

    await userEvent.click(
      drawnOf(canvas.getAllByRole('button', { name: result.genres[0] })),
    )

    await stopsChoosing(canvasElement)
  },
}

export const iPadでも選ぶ帯は窓の下に浮かぶ: Story = {
  name: 'iPadでも選ぶ帯は窓の下に浮かぶ',
  args: { result: resultOf(LIBRARY_SHELF), filter: {}, view: GRID },
  parameters: { screen: { width: 1180, height: 820 }, coarse: true },
  play: async ({ canvasElement }) => {
    await startChoosing(canvasElement)
    await floatsAtTheFoot(pickingRow(canvasElement))
    await expect(
      within(canvasElement).getByRole('heading', {
        level: 1,
        name: 'ライブラリ',
      }),
    ).toBeVisible()
  },
}

/** On a finger's screen, presses `選ぶ`, sees the bar wait at none picked, and sees it go once the one taken in is left out. */
async function waitsAtNoneThenLeaves(canvasElement: HTMLElement) {
  const canvas = within(canvasElement)
  const [first] = LIBRARY_SHELF

  await startChoosing(canvasElement)

  const row = within(pickingRow(canvasElement))

  await expect(row.getByText('録画を選ぶ')).toBeVisible()
  await expect(row.getByRole('button', { name: 'すべて選ぶ' })).toBeVisible()

  await userEvent.click(pickOf(canvasElement, first))
  await expect(pickingRow(canvasElement)).toHaveTextContent('1 件を選択')
  await expect(canvas.getByRole('toolbar')).toBeVisible()

  await pressAndSinks(canvasElement, pickOf(canvasElement, first))
}

export const iPadでは選ぶ直後の0件は帯が待ち1件選んで外すとやめる: Story = {
  name: 'iPadでは選ぶ直後の0件は帯が待ち1件選んで外すとやめる',
  args: { result: resultOf(LIBRARY_SHELF), filter: {}, view: GRID },
  parameters: { screen: { width: 1180, height: 820 }, coarse: true },
  play: async ({ canvasElement }) => {
    await waitsAtNoneThenLeaves(canvasElement)
  },
}

export const 表_iPadでも選ぶ直後の0件は帯が待ち1件選んで外すとやめる: Story = {
  name: '表 iPadでも選ぶ直後の0件は帯が待ち1件選んで外すとやめる',
  args: { result: resultOf(LIBRARY_SHELF), filter: {}, view: TABLE },
  parameters: { screen: { width: 1180, height: 820 }, coarse: true },
  play: async ({ canvasElement }) => {
    await waitsAtNoneThenLeaves(canvasElement)
  },
}

export const iPadでは上に選ぶがありチェックは出ない: Story = {
  name: 'iPadでは上に選ぶがありチェックは出ない',
  args: { result: resultOf(LIBRARY_SHELF), filter: {}, view: GRID },
  parameters: { screen: { width: 1180, height: 820 }, coarse: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const [first] = LIBRARY_SHELF

    await afterTheArrival(canvasElement)
    await expect(
      drawnOf(canvas.getAllByRole('button', { name: '選ぶ' })),
    ).toBeVisible()
    await hoverOn(canvasElement, first)
    await expect(canvas.queryAllByRole('checkbox')).toEqual([])

    await startChoosing(canvasElement)
    await expect(pickingRow(canvasElement)).toHaveTextContent('録画を選ぶ')
    await expect(canvas.getAllByRole('checkbox')).toHaveLength(
      LIBRARY_SHELF.length,
    )
  },
}

export const 表_iPadでは上に選ぶがありチェックは出ない: Story = {
  name: '表 iPadでは上に選ぶがありチェックは出ない',
  ...iPadでは上に選ぶがありチェックは出ない,
  args: { result: resultOf(LIBRARY_SHELF), filter: {}, view: TABLE },
}

export const 狭い幅で収まらないほどの録画: Story = {
  args: { result: resultOf(MORE_RECORDINGS_THAN_FIT), filter: {} },
  parameters: { screen: { width: 768, height: 1024 } },
  play: async ({ canvasElement }) => {
    await scrollsInsideWithItsHeaderHeld(canvasElement, '番組', {
      pageStays: true,
    })
  },
}

function phoneRows(canvasElement: HTMLElement): HTMLElement {
  const found = canvasElement.querySelector<HTMLElement>(
    '[data-slot="phone-recording-rows"]',
  )

  if (!found) {
    throw new Error('the phone list is not drawn')
  }

  return found
}

const WATCHED: Recording[] = LONG_AND_SHORT.map((one, nth) =>
  nth === 0 && one.lengthSec
    ? { ...one, watchedSec: Math.round(one.lengthSec / 2) }
    : one,
)

export const 電話の幅では絵の行を日付で区切って並べる: Story = {
  args: { result: resultOf(WATCHED), filter: {} },
  parameters: { screen: PHONE },
  play: async ({ canvasElement }) => {
    await afterTheArrival(canvasElement)

    const rows = await waitFor(() => phoneRows(canvasElement))

    await expect(
      canvasElement.querySelector('[data-slot="table-container"]'),
    ).not.toBeVisible()
    await expect(rows.getBoundingClientRect().width).toBe(window.innerWidth)

    const [first] = WATCHED
    const row = rows.querySelector<HTMLElement>(
      `[data-recording="${first.id}"]`,
    )!

    await expect(row).toHaveTextContent(first.title)
    await expect(row).toHaveTextContent(first.channel)
    await expect(
      within(row).getByRole('link', { name: new RegExp(first.title) }),
    ).toHaveAttribute('href', `/recordings/${first.id}`)
    await expect(rows.querySelectorAll('h2').length).toBeGreaterThan(0)

    const going = canvasElement.querySelector<HTMLElement>(
      '[data-slot="phone-continue"]',
    )!

    await expect(going).toBeVisible()
    await expect(
      within(going).getByRole('link', { name: new RegExp(first.title) }),
    ).toHaveAttribute('href', `/recordings/${first.id}?play=1`)
  },
}

export const 電話の幅では行の点から削除し知らせで元に戻す: Story = {
  args: { result: resultOf(LONG_AND_SHORT), filter: {} },
  parameters: { screen: NARROW_PHONE },
  play: async ({ canvasElement }) => {
    asked.length = 0

    const rows = await waitFor(() => phoneRows(canvasElement))
    const done = LONG_AND_SHORT.find((one) => one.outcome !== 'recording')!
    const row = within(
      rows.querySelector<HTMLElement>(`[data-recording="${done.id}"]`)!,
    )

    await userEvent.click(row.getByRole('button', { name: 'この録画の操作' }))
    await userEvent.click(row.getByRole('button', { name: '削除' }))

    await waitFor(() =>
      expect(rows.querySelector(`[data-recording="${done.id}"]`)).toBeNull(),
    )

    const toast = canvasElement.querySelector<HTMLElement>(
      '[data-slot="toast"]',
    )!

    await userEvent.click(
      within(toast).getByRole('button', { name: '元に戻す' }),
    )
    await waitFor(() =>
      expect(
        rows.querySelector(`[data-recording="${done.id}"]`),
      ).not.toBeNull(),
    )
    await expect(asked).toEqual([])
  },
}

export const 電話の幅で選んで削除する: Story = {
  args: { result: resultOf(LONG_AND_SHORT), filter: {} },
  parameters: { screen: NARROW_PHONE },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    thrownAway.length = 0

    const toggle = canvas.getByRole('button', { name: '選ぶ' })

    await userEvent.click(toggle)
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')

    const band = within(pickingRow(canvasElement))

    await expect(band.getByText('録画を選ぶ')).toBeVisible()
    await expect(band.getByRole('button', { name: '削除' })).toBeDisabled()

    const done = LONG_AND_SHORT.filter((one) => one.outcome !== 'recording')

    for (const one of done) {
      await userEvent.click(pickOf(canvasElement, one))
    }

    await expect(pickingRow(canvasElement)).toHaveTextContent(
      `${done.length} 件を選択`,
    )
    await expect(window.location.pathname).not.toMatch(/\/recordings\//)

    await userEvent.click(band.getByRole('button', { name: '削除' }))

    const dialog = within(await screen.findByRole('alertdialog'))

    await userEvent.click(dialog.getByRole('button', { name: '削除する' }))
    await waitFor(() => expect(thrownAway).toEqual([done.map((one) => one.id)]))
    await stopsChoosing(canvasElement)
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  },
}

export const 電話の帯ですべて選ぶ: Story = {
  args: { result: resultOf(LIBRARY_SHELF), filter: {}, view: GRID },
  parameters: { screen: PHONE },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const rows = await waitFor(() => phoneRows(canvasElement))
    const [first] = LIBRARY_SHELF
    const row = rows.querySelector<HTMLElement>(
      `[data-recording="${first.id}"]`,
    )!
    const picture = () =>
      row.querySelector('[data-thumbnail]')!.getBoundingClientRect().left
    const before = picture()

    await userEvent.click(canvas.getByRole('button', { name: '選ぶ' }))

    const band = within(pickingRow(canvasElement))

    await expect(picture()).toBe(before)
    await userEvent.click(band.getByRole('button', { name: 'すべて選ぶ' }))
    await expect(pickingRow(canvasElement)).toHaveTextContent(
      `${LIBRARY_SHELF.length} 件を選択`,
    )
    await expect(picture()).toBe(before)
    await expect(
      pickingRow(canvasElement).getBoundingClientRect().bottom,
    ).toBeLessThanOrEqual(
      canvasElement
        .querySelector('[data-slot="tab-bar"]')
        ?.getBoundingClientRect().top ?? window.innerHeight,
    )

    await pressAndSinks(
      canvasElement,
      band.getByRole('button', { name: 'すべて外す' }),
    )
  },
}

export const 電話でも選ぶ直後の0件は帯が待ち1件選んで外すとやめる: Story = {
  args: { result: resultOf(LIBRARY_SHELF), filter: {}, view: GRID },
  parameters: { screen: PHONE },
  play: async ({ canvasElement }) => {
    await waitFor(() => phoneRows(canvasElement))
    await waitsAtNoneThenLeaves(canvasElement)
  },
}

export const 電話の幅では絞りを畳む: Story = {
  args: { result: resultOf(LONG_AND_SHORT), filter: {} },
  parameters: { screen: PHONE },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const search = drawnOf(
      canvas.getAllByPlaceholderText('番組名・概要・出演者で検索'),
    )
    const fold = canvas.getByRole('button', { name: '絞り込み' })

    await expect(search).toBeVisible()
    await expect(fold).toHaveAttribute('aria-expanded', 'false')
    await expect(
      Math.abs(
        search.getBoundingClientRect().top - fold.getBoundingClientRect().top,
      ),
    ).toBeLessThanOrEqual(1)
    await expect(canvas.queryAllByRole('combobox')).toEqual([])
    await expect(canvas.queryByRole('group', { name: 'チャンネル' })).toBeNull()

    await userEvent.click(fold)

    await expect(fold).toHaveAttribute('aria-expanded', 'true')
    await expect(canvas.getAllByRole('combobox').length).toBe(3)
    await expect(
      canvas.getByRole('group', { name: 'チャンネル' }),
    ).toBeVisible()

    const panel = canvas.getByRole('group', { name: 'チャンネル' })
    const list = phoneRows(canvasElement)

    await expect(panel.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      list.getBoundingClientRect().top,
    )

    await userEvent.click(fold)
    await expect(canvas.queryAllByRole('combobox')).toEqual([])
  },
}

export const 電話の幅では絞りの数をボタンで言う: Story = {
  args: {
    result: resultOf(LONG_AND_SHORT),
    filter: { year: '2025', state: '完了' },
  },
  parameters: { screen: PHONE },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('button', { name: '絞り込み 2' }),
    ).toBeVisible()
  },
}

export const 幅600pxからは表のまま: Story = {
  name: '幅600pxからは表のまま',
  args: { result: resultOf(LONG_AND_SHORT), filter: {} },
  parameters: { screen: FROM_600 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const table = await waitFor(() => canvas.getByRole('table'))

    await expect(getComputedStyle(table).display).toBe('table')
    await expect(canvas.queryByRole('button', { name: '絞り込み' })).toBeNull()
    await expect(canvas.getAllByRole('combobox').length).toBe(3)
  },
}

export const 横向きの電話は検索の欄を上の帯に置く: Story = {
  args: { result, filter: {} },
  parameters: { screen: { width: 844, height: 390 }, coarse: true },
  play: async ({ canvasElement }) => {
    const bar = canvasElement.querySelector<HTMLElement>(
      '[data-slot="top-bar"]',
    )!
    const field = within(bar).getByPlaceholderText('番組名・概要・出演者で検索')

    await expect(field).toBeVisible()
    await expect(
      within(bar).getByRole('button', { name: /絞り込み/ }),
    ).toBeVisible()
    await expect(
      within(bar).getByRole('button', { name: '選ぶ' }),
    ).toBeVisible()
    await expect(
      within(canvasElement).getAllByPlaceholderText(
        '番組名・概要・出演者で検索',
      ),
    ).toHaveLength(3)
    await expect(
      [
        ...canvasElement.querySelectorAll<HTMLElement>(
          'input[placeholder="番組名・概要・出演者で検索"]',
        ),
      ].filter((one) => one.getBoundingClientRect().height > 0),
    ).toHaveLength(1)
  },
}

export const 日付の格子_iPad: Story = {
  name: '日付の格子 iPad',
  args: { result: shelf, filter: {}, view: GRID },
  parameters: { screen: { width: 1180, height: 820 } },
  play: async ({ canvasElement }) => {
    const going = await waitFor(() => {
      const found = canvasElement.querySelector<HTMLElement>(
        '[data-slot="continue-row"]',
      )

      expect(found).not.toBeNull()

      return found!
    })

    await expect(
      [...going.querySelectorAll('li')].filter(
        (one) => one.getBoundingClientRect().width > 0,
      ),
    ).toHaveLength(3)
  },
}

export const 表_iPad: Story = {
  name: '表 iPad',
  ...表,
  parameters: { screen: { width: 1180, height: 820 } },
}

export const 電話の棚: Story = {
  args: { result: shelf, filter: {}, view: GRID },
  parameters: { screen: PHONE },
  play: async ({ canvasElement }) => {
    const rows = await waitFor(() => phoneRows(canvasElement))

    await expect(
      rows.querySelectorAll('[data-slot="unwatched-dot"]'),
    ).toHaveLength(
      LIBRARY_SHELF.filter((one) => one.watchedSec === undefined).length,
    )
  },
}

export const 横向きの電話の棚: Story = {
  args: { result: shelf, filter: {}, view: GRID },
  parameters: { screen: { width: 844, height: 390 }, coarse: true },
}

export const 電話の帯にはサムネイルの再生成と削除が並ぶ: Story = {
  args: { result: resultOf(LIBRARY_SHELF), filter: {} },
  parameters: { screen: PHONE, coarse: true },
  play: async ({ canvasElement }) => {
    await startChoosing(canvasElement)
    await userEvent.click(pickOf(canvasElement, LIBRARY_SHELF[0]))

    const band = pickingRow(canvasElement)
    const row = within(band)

    await expect(band).toHaveAttribute('data-slot', 'picking-band')
    await expect(band).toHaveTextContent('1 件')
    await expect(row.getByRole('button', { name: '再生成' })).toBeEnabled()
    await expect(row.getByRole('button', { name: '削除' })).toBeEnabled()
    await expect(band.getBoundingClientRect().right).toBeLessThanOrEqual(
      document.documentElement.clientWidth + 0.5,
    )
  },
}
