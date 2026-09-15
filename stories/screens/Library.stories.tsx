import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import type { Recording, RecordingDiscarded } from '@/repository/recordings'
import { STANDING_LABEL, type EncodeStanding } from '@/repository/encode-terms'
import {
  MORE_RECORDINGS_THAN_FIT,
  RECORDING_FIXTURES,
} from '@/stories/fixtures/recordings'
import { inProgressFirst } from '@/lib/recordings'
import { AppFrame } from '@/components/vela/app-shell'
import { LibraryView } from '@/components/library/library-page'
import { scrollsInsideWithItsHeaderHeld } from '@/stories/scrolls-inside'

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
  parameters: { layout: 'fullscreen' },
  args: { onDelete: throwing },
  decorators: [
    (Story) => (
      <AppFrame>
        <Story />
      </AppFrame>
    ),
  ],
} satisfies Meta<typeof LibraryView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = {
  args: { result, filter: {} },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    asked.length = 0

    await expect(
      within(
        canvas.getByRole('row', { name: /夜ふかしラジオ倶楽部/ }),
      ).getByRole('button', { name: '削除' }),
    ).toBeDisabled()

    const unwatchable = within(
      canvas.getByRole('row', { name: /波止場のブラスバンド/ }),
    )

    await expect(unwatchable.getByText('視聴不可の恐れ')).toBeVisible()
    await expect(
      unwatchable.getByText('ドロップ 0 / スクランブル残存 5,042,768'),
    ).toBeVisible()

    await expect(
      unwatchable.getByRole('button', { name: '再生' }),
    ).toBeDisabled()
    await expect(
      within(
        canvas.getByRole('row', { name: /金曜シネマ「星の渡り鳥」/ }),
      ).getByRole('link', { name: '再生' }),
    ).toHaveAttribute('href', '/recordings/1198?at=0')
    await expect(
      within(
        canvas.getByRole('row', { name: /夜ふかしラジオ倶楽部/ }),
      ).getByRole('button', { name: '再生' }),
    ).toBeDisabled()

    const finished = within(
      canvas.getByRole('row', { name: /週末キッチンの手帖/ }),
    ).getByRole('button', { name: '削除' })

    await expect(finished).toBeEnabled()
    await userEvent.click(finished)

    const dialog = within(await screen.findByRole('alertdialog'))
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
      ).toHaveTextContent('未エンコード')
    }
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

    await expect(outcomeOf(rows[0])).not.toHaveTextContent('削除未完了')

    await expect(outcomeOf(rows[1])).toHaveTextContent('削除未完了')
    await expect(outcomeOf(rows[1])).not.toHaveTextContent('残り')

    await expect(outcomeOf(rows[2])).toHaveTextContent('削除未完了')
    await expect(outcomeOf(rows[2])).toHaveTextContent('残り 2 ファイル')
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
