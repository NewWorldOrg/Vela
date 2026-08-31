import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import type {
  RecordingDiscarded,
  ThumbnailWrite,
} from '@/repository/recordings'
import { RECORDING_DETAIL_FIXTURES } from '@/stories/fixtures/recording-details'
import { RecordingDetailView } from '@/components/recordings/recording-detail-page'

function detail(id: string) {
  const found = RECORDING_DETAIL_FIXTURES.find((r) => r.id === id)
  if (!found) {
    throw new Error(`fixture ${id} not found`)
  }
  return found
}

async function remade(): Promise<ThumbnailWrite> {
  return { state: 'ok', remake: 'drawn' }
}

const asked: string[] = []

async function throwing(id: string): Promise<RecordingDiscarded> {
  asked.push(id)

  return { state: 'ok', filesRemoved: 1 }
}

const meta = {
  title: 'Screens/録画詳細',
  component: RecordingDetailView,
  parameters: { layout: 'fullscreen' },
  args: { onRemakeThumbnail: remade, onDelete: throwing },
} satisfies Meta<typeof RecordingDetailView>

export default meta
type Story = StoryObj<typeof meta>

export const 完全: Story = {
  args: { detail: detail('1274') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // The row it lands on, not the top of the list. A link naming only the
    // screen would pass a check that pressed it and left the reader to find
    // the reservation among the rest.
    await expect(
      canvas.getByRole('link', { name: 'この録画の予約' }),
    ).toHaveAttribute('href', '/reservations#reservation-r-309')

    asked.length = 0

    const remove = canvas.getByRole('button', { name: '削除' })

    await expect(remove).toBeEnabled()
    await userEvent.click(remove)

    const dialog = within(await screen.findByRole('alertdialog'))

    await expect(dialog.getByText('/srv/recordings/1274.m2ts')).toBeVisible()
    await expect(asked).toEqual([])

    await userEvent.click(dialog.getByRole('button', { name: '削除する' }))
    await waitFor(() => expect(asked).toEqual(['1274']))
  },
}
export const 警告水準: Story = { args: { detail: detail('1266') } }
export const 尻切れ: Story = { args: { detail: detail('1247') } }
export const 失敗: Story = { args: { detail: detail('1239') } }
export const ファイル不在: Story = { args: { detail: detail('0731') } }
export const 録画中: Story = {
  args: { detail: detail('1291') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // A recording still being written is not thrown away, and the reason is on
    // the button rather than left for the API to say after the press.
    const remove = canvas.getByRole('button', { name: '削除' })

    await expect(remove).toBeDisabled()
    await expect(remove).toHaveAttribute('title', '録画中は削除できません')
  },
}
export const 未計測: Story = {
  args: { detail: detail('0412') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // A recording no reservation asked for. The other rows of the same block
    // are still drawn, so the missing one is a missing row and not a missing
    // screen.
    await expect(canvas.getByText('録画日時')).toBeInTheDocument()
    await expect(canvas.queryByText('予約')).toBeNull()
    await expect(
      canvas.queryByRole('link', { name: 'この録画の予約' }),
    ).toBeNull()
  },
}
