import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import type { Recording, RecordingDiscarded } from '@/repository/recordings'
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
  sayOf,
  saysItWithoutAnEdge,
  tipIn,
} from '@/stories/pills-in-a-column'
import { afterTheArrival } from '@/stories/after-the-arrival'
import { scrollsInsideWithItsHeaderHeld } from '@/stories/scrolls-inside'
import { inTheApp } from '@/stories/frames'

const asked: string[] = []

async function throwing(id: string): Promise<RecordingDiscarded> {
  asked.push(id)

  return { state: 'ok', filesRemoved: 1 }
}

const STILL_RECORDING =
  'この録画はまだ書き込み中です。録画を止めてから削除してください。'

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

const meta = {
  title: 'Screens/録画ライブラリ',
  component: LibraryView,
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/library' } },
    layout: 'fullscreen',
  },
  args: { onDelete: throwing },
  decorators: [inTheApp],
} satisfies Meta<typeof LibraryView>

export default meta
type Story = StoryObj<typeof meta>

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

    await expect(unwatchable.getByText('視聴不可')).toBeVisible()

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

const STANDINGS: EncodeStanding[] = [
  'notEncoded',
  'queued',
  'running',
  'completed',
  'failed',
]

const ENCODE_COLUMN = 7

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

const OUTCOME_COLUMN = 5

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

const QUALITY_COLUMN = 6

export const 全件未計測: Story = {
  args: {
    result: resultOf(
      all
        .filter((r) => r.outcome !== 'recording')
        .map((r) => ({
          ...r,
          quality: { measured: false },
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

const LENGTH_COLUMN = 3

const SIZE_COLUMN = 4

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
    const band = [
      canvas.getByPlaceholderText('番組名・概要・出演者で検索'),
      ...canvas.getAllByRole('combobox'),
      canvas.getByRole('button', { name: 'すべて' }),
    ]

    await expect(band.length).toBeGreaterThan(4)
    await expect(new Set(band.map(heightOf)).size).toBe(1)
    await expect(
      new Set(band.map((one) => getComputedStyle(one).fontSize)).size,
    ).toBe(1)
  },
}
