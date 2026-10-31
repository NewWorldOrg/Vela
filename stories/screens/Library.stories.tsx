import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import type {
  Recording,
  RecordingBatch,
  RecordingDiscarded,
} from '@/repository/recordings'
import { STANDING_LABEL, type EncodeStanding } from '@/repository/encode-terms'
import {
  MORE_RECORDINGS_THAN_FIT,
  RECORDING_FIXTURES,
} from '@/stories/fixtures/recordings'
import { inProgressFirst } from '@/lib/recordings'
import { LibraryView } from '@/components/library/library-page'
import {
  cellOf,
  heightOf,
  oneShapeDownTheColumn,
  saidIn,
  sayOf,
  saysItWithoutAnEdge,
  tipIn,
} from '@/stories/pills-in-a-column'
import { afterTheArrival } from '@/stories/after-the-arrival'
import { scrollsInsideWithItsHeaderHeld } from '@/stories/scrolls-inside'
import { inTheApp } from '@/stories/frames'
import { LIBRARY_SHELF } from '@/stories/fixtures/library-shelf'
import {
  FROM_600,
  laysRowsAsATable,
  NARROW_PHONE,
  PHONE,
} from '@/stories/rows-as-cards'

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

const meta = {
  title: 'Screens/ライブラリ',
  component: LibraryView,
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/library' } },
    layout: 'fullscreen',
  },
  args: { onDelete: throwing, onDeleteAll: throwingAway },
  decorators: [inTheApp],
} satisfies Meta<typeof LibraryView>

export default meta
type Story = StoryObj<typeof meta>

export const 複数を選んで削除する: Story = {
  args: { result, filter: {} },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const [first, second] = result.items.filter(
      (one) => one.outcome !== 'recording',
    )

    thrownAway.length = 0

    await userEvent.click(
      canvas.getByRole('checkbox', { name: `${first.title} を選ぶ` }),
    )
    await userEvent.click(
      canvas.getByRole('checkbox', { name: `${second.title} を選ぶ` }),
    )
    await expect(
      canvas.getByRole('group', { name: '選択した録画の操作' }),
    ).toHaveTextContent('2 件を選択')
    await expect(window.location.pathname).not.toMatch(/\/recordings\//)

    await userEvent.click(
      within(
        canvas.getByRole('group', { name: '選択した録画の操作' }),
      ).getByRole('button', { name: '削除' }),
    )

    const dialog = within(await screen.findByRole('alertdialog'))

    await expect(dialog.getByText(first.title)).toBeVisible()
    await expect(dialog.getByText(second.title)).toBeVisible()
    await userEvent.click(dialog.getByRole('button', { name: '削除する' }))

    await waitFor(() => expect(thrownAway).toEqual([[first.id, second.id]]))
    await waitFor(() =>
      expect(
        canvas.queryByRole('group', { name: '選択した録画の操作' }),
      ).toBeNull(),
    )
  },
}

export const 絞りを変えると選択を外す: Story = {
  args: { result, filter: {} },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const [first] = result.items

    await userEvent.click(
      canvas.getByRole('checkbox', { name: `${first.title} を選ぶ` }),
    )
    await expect(
      canvas.getByRole('group', { name: '選択した録画の操作' }),
    ).toBeVisible()

    await userEvent.click(
      canvas.getByRole('button', { name: result.channels[0] }),
    )

    await expect(
      canvas.queryByRole('group', { name: '選択した録画の操作' }),
    ).toBeNull()
    await expect(
      canvas.getByRole('checkbox', { name: '表示中の録画をすべて選ぶ' }),
    ).not.toBeChecked()
  },
}

export const 録画中を含むと削除できない: Story = {
  args: { result, filter: {} },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const recording = result.items.find((one) => one.outcome === 'recording')

    await expect(recording).toBeDefined()
    await userEvent.click(
      canvas.getByRole('checkbox', { name: '表示中の録画をすべて選ぶ' }),
    )

    const bar = within(
      canvas.getByRole('group', { name: '選択した録画の操作' }),
    )

    await expect(bar.getByText(String(result.items.length))).toBeVisible()
    await expect(bar.getByRole('button', { name: '削除' })).toBeDisabled()
  },
}

export const 通常: Story = {
  args: { result, filter: {} },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await afterTheArrival(canvasElement)

    asked.length = 0

    await expect(
      within(
        canvas.getByRole('row', { name: /夜ふかしラジオ倶楽部/ }),
      ).getByRole('button', { name: '削除' }),
    ).toBeDisabled()

    const unwatchable = within(
      canvas.getByRole('row', { name: /波止場のブラスバンド/ }),
    )

    await expect(unwatchable.getByText('未解除')).toBeVisible()

    const said = await tipIn(unwatchable.getAllByRole('cell')[QUALITY_COLUMN])

    await expect(said).toHaveTextContent('視聴不可の恐れ')
    await expect(said).toHaveTextContent(
      'ドロップ 0 / スクランブル残存 5,042,768',
    )

    await expect(canvas.queryAllByRole('button', { name: '再生' })).toEqual([])
    await expect(canvas.queryAllByRole('link', { name: '再生' })).toEqual([])

    const finished = within(
      canvas.getByRole('row', { name: /週末キッチンの手帖/ }),
    ).getByRole('button', { name: '削除' })

    await expect(finished).toBeEnabled()
    await userEvent.click(finished)

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
    const canvas = within(canvasElement)

    await userEvent.click(
      within(canvas.getByRole('row', { name: /週末キッチンの手帖/ })).getByRole(
        'button',
        { name: '削除' },
      ),
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
    const canvas = within(canvasElement)

    await userEvent.click(
      within(canvas.getByRole('row', { name: /週末キッチンの手帖/ })).getByRole(
        'button',
        { name: '削除' },
      ),
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

const ENCODE_COLUMN = 8

export const エンコードの5状態: Story = {
  args: {
    result: resultOf(
      STANDINGS.map((encode, index) => ({ ...all[index], encode })),
    ),
    filter: {},
  },
  play: async ({ canvasElement }) => {
    const rows = within(canvasElement).getAllByRole('row').slice(1)

    for (const [index, standing] of STANDINGS.entries()) {
      await expect(
        within(rows[index]).getAllByRole('cell')[ENCODE_COLUMN],
      ).toHaveTextContent(STANDING_LABEL[standing])
    }
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
    const rows = within(canvasElement).getAllByRole('row').slice(1)

    for (const row of rows) {
      await expect(
        within(row).getAllByRole('cell')[ENCODE_COLUMN],
      ).toHaveTextContent('未実施')
    }
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
    const rows = within(canvasElement).getAllByRole('row').slice(1)
    const encodeOf = (row: HTMLElement) =>
      within(row).getAllByRole('cell')[ENCODE_COLUMN]

    await expect(encodeOf(rows[0])).toHaveTextContent('対象外')
    await expect(encodeOf(rows[0])).not.toHaveTextContent('自動実行')
    await expect(encodeOf(rows[0])).not.toHaveTextContent('未実施')
    await expect(await tipIn(encodeOf(rows[0]))).toHaveTextContent(
      '自動実行の対象外',
    )
    await userEvent.keyboard('{Escape}')

    await expect(encodeOf(rows[1])).toHaveTextContent('未実施')
    await expect(encodeOf(rows[1])).not.toHaveTextContent('自動実行')

    await expect(encodeOf(rows[2])).toHaveTextContent('待機中')
  },
}

const OUTCOME_COLUMN = 6

const ENDED = all.filter((r) => r.outcome !== 'recording')

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
    const rows = within(canvasElement).getAllByRole('row').slice(1)
    const outcomeOf = (row: HTMLElement) =>
      within(row).getAllByRole('cell')[OUTCOME_COLUMN]

    await expect(await tipIn(outcomeOf(rows[0]))).not.toHaveTextContent(
      '削除未完了',
    )

    await expect(await tipIn(outcomeOf(rows[1]))).toHaveTextContent(
      '削除未完了',
    )
    await expect(await tipIn(outcomeOf(rows[1]))).not.toHaveTextContent('残り')

    await expect(await tipIn(outcomeOf(rows[2]))).toHaveTextContent(
      '削除未完了',
    )
    await expect(await tipIn(outcomeOf(rows[2]))).toHaveTextContent(
      '残り 2 ファイル',
    )
    await expect(
      within(rows[2]).getByRole('button', { name: '削除' }),
    ).toBeEnabled()
  },
}

const QUALITY_COLUMN = 7

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
    const canvas = within(canvasElement)
    const rows = canvas.getAllByRole('row').slice(1)

    await expect(rows.length).toBeGreaterThan(1)

    for (const row of rows) {
      await expect(
        within(row).getAllByRole('cell')[QUALITY_COLUMN],
      ).toHaveTextContent('未計測')
    }

    await expect(canvas.queryByRole('alert')).toBeNull()
  },
}

const LENGTH_COLUMN = 4

const SIZE_COLUMN = 5

const ENDED_BADLY = all.filter(
  (r) => r.outcome === 'truncated' || r.outcome === 'failed',
)

export const 尻切れと失敗の録画: Story = {
  args: { result: resultOf(ENDED_BADLY), filter: {} },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const truncated = within(
      canvas.getByRole('row', { name: /深夜の商店街をあるく/ }),
    )

    await expect(
      truncated.getAllByRole('cell')[OUTCOME_COLUMN],
    ).toHaveTextContent('尻切れ')
    const length = truncated.getAllByRole('cell')[LENGTH_COLUMN]

    await expect(length).toHaveTextContent('36:12')
    await expect(length).not.toHaveTextContent('54:00')
    await expect(await tipIn(length)).toHaveTextContent('予定 54:00')

    const failed = within(canvas.getByRole('row', { name: /となりの発明王/ }))
    const outcome = failed.getAllByRole('cell')[OUTCOME_COLUMN]

    await expect(outcome).toHaveTextContent('失敗')
    await expect(await tipIn(outcome)).toHaveTextContent(
      'スクランブル解除できず',
    )
    await expect(failed.getAllByRole('cell')[SIZE_COLUMN]).toHaveTextContent(
      '0 B',
    )

    const quality = failed.getAllByRole('cell')[QUALITY_COLUMN]

    await expect(quality).toHaveTextContent('未計測')
    await expect(quality).not.toHaveTextContent('良好')
    await expect(quality).not.toHaveTextContent('ドロップ')

    await expect(failed.queryByRole('button', { name: '再生' })).toBeNull()
    await expect(failed.getByRole('button', { name: '削除' })).toBeEnabled()
  },
}

const KEPT = all.filter((r) => r.outcome === 'complete' && !r.fileMissing)

const GONE = all.filter((r) => r.fileMissing)

export const ファイル不在の録画: Story = {
  args: { result: resultOf([KEPT[0], ...GONE]), filter: {} },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const gone = within(canvas.getByRole('row', { name: /朝のバードウォッチ/ }))

    await expect(
      await tipIn(gone.getAllByRole('cell')[OUTCOME_COLUMN]),
    ).toHaveTextContent('ファイル不在')

    const size = gone.getAllByRole('cell')[SIZE_COLUMN]

    await expect(size).toHaveTextContent('実ファイルなし')
    await expect(size).not.toHaveTextContent('GB')
    await expect(size).not.toHaveTextContent('観測')

    await expect(gone.queryByRole('button', { name: '再生' })).toBeNull()
    await expect(gone.getByRole('button', { name: '削除' })).toBeEnabled()

    const kept = within(
      canvas.getByRole('row', { name: /週末キッチンの手帖/ }),
    ).getAllByRole('cell')[SIZE_COLUMN]

    await expect(kept).not.toHaveTextContent('観測')
    await expect(await tipIn(kept)).toHaveTextContent('観測')
  },
}

const LEFT_SCRAMBLED = {
  ...all.find((r) => r.title === '波止場のブラスバンド')!,
  leftScrambled: true,
  outcomeDetail: 'スクランブル解除失敗',
}

const DESCRAMBLED = {
  ...all.find((r) => r.title === '手仕事の地図')!,
  leftScrambled: false,
}

export const スクランブルが解けずに残った録画: Story = {
  args: { result: resultOf([LEFT_SCRAMBLED, DESCRAMBLED]), filter: {} },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const scrambled = canvas.getByRole('row', { name: /波止場のブラスバンド/ })

    await expect(saidIn(scrambled, OUTCOME_COLUMN)).toHaveLength(1)
    await expect(sayOf(scrambled, OUTCOME_COLUMN)).toHaveTextContent('完全')
    await expect(
      await tipIn(cellOf(scrambled, OUTCOME_COLUMN)),
    ).toHaveTextContent('スクランブル解除失敗')

    await expect(saidIn(scrambled, QUALITY_COLUMN)).toHaveLength(1)

    const unresolved = sayOf(scrambled, QUALITY_COLUMN)

    await expect(unresolved).toHaveTextContent('未解除')
    await expect(unresolved.getAttribute('data-tone')).toBe('err')
    await expect(getComputedStyle(unresolved).fontWeight).toBe('700')

    const tip = await tipIn(cellOf(scrambled, QUALITY_COLUMN))

    await expect(tip).toHaveTextContent('スクランブル残存。')
    await expect(tip).toHaveTextContent('視聴不可の恐れ')
    await expect(tip).toHaveTextContent('スクランブル残存 5,042,768')

    const descrambled = canvas.getByRole('row', { name: /手仕事の地図/ })

    await expect(sayOf(descrambled, OUTCOME_COLUMN)).toHaveTextContent('完全')
    await expect(sayOf(descrambled, QUALITY_COLUMN)).not.toHaveTextContent(
      '未解除',
    )
    await expect(
      within(descrambled).queryByText('未解除'),
    ).not.toBeInTheDocument()
  },
}

const CARRIED_ON_AFTER_A_GAP = {
  ...all.find((r) => r.title === '手仕事の地図')!,
  gap: { label: '欠け 3.8 秒', detail: '欠け 22:10 から 3.8 秒' },
}

export const 欠けのある録画: Story = {
  args: {
    result: resultOf([CARRIED_ON_AFTER_A_GAP, LEFT_SCRAMBLED]),
    filter: {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const gapped = canvas.getByRole('row', { name: /手仕事の地図/ })

    await expect(sayOf(gapped, OUTCOME_COLUMN)).toHaveTextContent('完全')

    const mark = gapped.querySelector<HTMLElement>('[data-slot="gap-mark"]')

    await expect(mark).not.toBeNull()
    await expect(mark).toHaveTextContent('欠け 3.8 秒')
    await expect(
      canvas
        .getByRole('row', { name: /波止場のブラスバンド/ })
        .querySelector('[data-slot="gap-mark"]'),
    ).toBeNull()
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
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '削除' }))

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
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '削除' }))

    await expect(
      within(await screen.findByRole('alertdialog')).getByText(/GB/),
    ).toHaveTextContent('3.4 GB (実ファイルなし)')
  },
}

export const スクランブルが解けずに残った録画の削除: Story = {
  args: { result: resultOf([LEFT_SCRAMBLED]), filter: {} },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '削除' }))

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

export const 狭い幅で収まらないほどの録画: Story = {
  args: { result: resultOf(MORE_RECORDINGS_THAN_FIT), filter: {} },
  parameters: { screen: { width: 768, height: 1024 } },
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

const CHIP_COLUMNS = [OUTCOME_COLUMN, QUALITY_COLUMN, ENCODE_COLUMN]

export const 札の並び: Story = {
  args: { result: resultOf(LONG_AND_SHORT), filter: {} },
  play: async ({ canvasElement }) => {
    const rows = within(canvasElement).getAllByRole('row').slice(1)

    await expect(rows.length).toBe(LONG_AND_SHORT.length)

    for (const row of rows) {
      const tops = CHIP_COLUMNS.map((column) =>
        Math.round(sayOf(row, column).getBoundingClientRect().top),
      )

      await expect(new Set(tops).size).toBe(1)
    }

    for (const column of CHIP_COLUMNS) {
      const lefts = rows.map((row) =>
        Math.round(sayOf(row, column).getBoundingClientRect().left),
      )

      await expect(new Set(lefts).size).toBe(1)

      const columnWidths = rows.map((row) =>
        Math.round(cellOf(row, column).getBoundingClientRect().width),
      )

      await expect(new Set(columnWidths).size).toBe(1)

      await saysItWithoutAnEdge(rows, column)
    }

    await oneShapeDownTheColumn(rows, ENCODE_COLUMN)

    const actions = rows.map((row) =>
      Math.round(
        within(row)
          .getByRole('button', { name: '削除' })
          .getBoundingClientRect().width,
      ),
    )

    await expect(new Set(actions).size).toBe(1)
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const fields = [
      canvas.getByPlaceholderText('番組名・概要・出演者で検索'),
      ...canvas.getAllByRole('combobox'),
    ]
    const channels = canvas.getByRole('group', { name: 'チャンネル' })
    const every = within(channels).getByRole('button', { name: 'すべて' })

    await expect(fields.length).toBeGreaterThan(3)
    await expect(new Set([...fields, channels].map(heightOf)).size).toBe(1)
    await expect(
      new Set([...fields, every].map((one) => getComputedStyle(one).fontSize))
        .size,
    ).toBe(1)
    await expect(every).toHaveAttribute('aria-pressed', 'true')
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

    await userEvent.click(canvas.getByRole('button', { name: '選ぶ' }))

    const done = LONG_AND_SHORT.filter((one) => one.outcome !== 'recording')

    for (const one of done) {
      await userEvent.click(
        canvas.getByRole('checkbox', { name: `${one.title} を選ぶ` }),
      )
    }

    const bar = within(
      canvas.getByRole('group', { name: '選択した録画の操作' }),
    )

    await expect(bar.getByText(`${done.length}`)).toBeVisible()

    const remove = bar.getByRole('button', { name: '削除' })

    await userEvent.click(remove)

    const dialog = within(await screen.findByRole('alertdialog'))

    await userEvent.click(dialog.getByRole('button', { name: '削除する' }))
    await waitFor(() => expect(thrownAway).toEqual([done.map((one) => one.id)]))
  },
}

export const 電話の幅では絞りを畳む: Story = {
  args: { result: resultOf(LONG_AND_SHORT), filter: {} },
  parameters: { screen: PHONE },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const search = canvas.getByPlaceholderText('番組名・概要・出演者で検索')
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
  args: { result: resultOf(LONG_AND_SHORT), filter: {} },
  parameters: { screen: FROM_600 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await laysRowsAsATable(canvasElement)
    await expect(canvas.queryByRole('button', { name: '絞り込み' })).toBeNull()
    await expect(canvas.getAllByRole('combobox').length).toBe(3)
    await expect(canvas.getByText('すべて選ぶ')).not.toBeVisible()
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
    ).toHaveLength(2)
    await expect(
      [
        ...canvasElement.querySelectorAll<HTMLElement>(
          'input[placeholder="番組名・概要・出演者で検索"]',
        ),
      ].filter((one) => one.getBoundingClientRect().height > 0),
    ).toHaveLength(1)
  },
}

const shelf = resultOf(LIBRARY_SHELF)

const A_DESKTOP = { width: 1440, height: 900 }

export const 日付の格子: Story = {
  args: { result: shelf, filter: {} },
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

export const 日付の格子_iPad: Story = {
  args: { result: shelf, filter: {} },
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

export const 表_iPad: Story = {
  ...表,
  parameters: { screen: { width: 1180, height: 820 } },
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

export const 電話の棚: Story = {
  args: { result: shelf, filter: {} },
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
  args: { result: shelf, filter: {} },
  parameters: { screen: { width: 844, height: 390 }, coarse: true },
}
