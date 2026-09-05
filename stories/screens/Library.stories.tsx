import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import type { Recording, RecordingDiscarded } from '@/repository/recordings'
import {
  MORE_RECORDINGS_THAN_FIT,
  RECORDING_FIXTURES,
} from '@/stories/fixtures/recordings'
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

const all = [...RECORDING_FIXTURES].sort(
  (a, b) =>
    (b.startedAt ?? '').localeCompare(a.startedAt ?? '') ||
    b.id.localeCompare(a.id, undefined, { numeric: true }),
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
  // The screen pins the frame to the window and gives the list what is left,
  // so it is drawn in the frame that answers the pin.
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

    // Both sides of the same button. A row still being written cannot be
    // thrown away and says so where the press would have been; a row that is
    // finished can, and a check that only looked for the disabled one would
    // pass on a screen where nothing is ever pressable.
    await expect(
      within(
        canvas.getByRole('row', { name: /夜ふかしラジオ倶楽部/ }),
      ).getByRole('button', { name: '削除' }),
    ).toBeDisabled()

    // The level is the one the API graded. This recording dropped nothing and
    // was written without ever being descrambled; counted from the dropped
    // packets alone, as the column used to, it read 良好.
    const unwatchable = within(
      canvas.getByRole('row', { name: /波止場のブラスバンド/ }),
    )

    await expect(unwatchable.getByText('視聴不可の恐れ')).toBeVisible()
    await expect(
      unwatchable.getByText('ドロップ 0 / スクランブル残存 5,042,768'),
    ).toBeVisible()

    // The way to the player is the row's 再生, and it is offered only where
    // the player would have something to show. A recording that stayed
    // scrambled has nothing, whatever its outcome says; one graded the same
    // level for its drops still plays, so the two are not told apart by the
    // badge.
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

    // The question names the row it was opened on, so a table that opened one
    // question over the wrong recording is a table this fails on.
    const dialog = within(await screen.findByRole('alertdialog'))
    await expect(dialog.getByText('/srv/recordings/1274.m2ts')).toBeVisible()

    // What qualifies the size is said in brackets after it. The row this was
    // opened on carries the moment the size was observed.
    await expect(dialog.getByText(/GB/)).toHaveTextContent(
      '3.4 GB (観測 08/09 23:31)',
    )
    await expect(asked).toEqual([])

    await userEvent.click(dialog.getByRole('button', { name: '削除する' }))
    await waitFor(() => expect(asked).toEqual(['1274']))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  },
}

/**
 * The API refuses, and the reason it gives is the whole of what the reader has
 * to go on: whether the files are still there is in the wording and nowhere
 * else. The question stays open behind it.
 */
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

/**
 * A recording carries no observation and no missing file, so the size has
 * nothing to be qualified by. The brackets belong to what would have gone in
 * them, and there is nothing to put there.
 */
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

/** The file is gone, which is what the brackets say instead of a moment. */
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
