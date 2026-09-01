import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import type {
  RecordingDiscarded,
  ThumbnailWrite,
} from '@/repository/recordings'
import type {
  PlaybackPlan,
  PlaybackRead,
  PlaybackRefusal,
  TicketWrite,
} from '@/repository/videos'
import { RECORDING_DETAIL_FIXTURES } from '@/stories/fixtures/recording-details'
import { RecordingDetailView } from '@/components/recordings/recording-detail-page'

function detail(id: string) {
  const found = RECORDING_DETAIL_FIXTURES.find((r) => r.id === id)
  if (!found) {
    throw new Error(`fixture ${id} not found`)
  }
  return found
}

/**
 * The plan the API answers with before any picture is asked for. The recording
 * this system has is transcoded as it plays, so seeking is a restart; the
 * `direct` plan below is what an encoded artefact the browser can decode
 * answers with instead.
 */
function planned(over: Partial<PlaybackPlan> = {}): PlaybackRead {
  return {
    state: 'planned',
    plan: {
      standing: 'whole',
      route: 'onTheFly',
      seeking: 'byStartingAgain',
      canSeek: false,
      transcodes: true,
      showsAsAWholeRecording: true,
      mediaType: 'video/mp4',
      ...over,
    },
  }
}

function refused(refusal: PlaybackRefusal): PlaybackRead {
  return { state: 'refused', refusal }
}

async function remade(): Promise<ThumbnailWrite> {
  return { state: 'ok', remake: 'drawn' }
}

const asked: string[] = []

async function throwing(id: string): Promise<RecordingDiscarded> {
  asked.push(id)

  return { state: 'ok', filesRemoved: 1 }
}

async function ticketed(): Promise<TicketWrite> {
  return {
    state: 'ok',
    ticket: {
      inTheClear: 'a-ticket-that-lapses',
      lapsesAt: '2026-08-11T00:00:30Z',
    },
  }
}

const meta = {
  title: 'Screens/録画詳細',
  component: RecordingDetailView,
  parameters: { layout: 'fullscreen' },
  args: {
    onRemakeThumbnail: remade,
    onDelete: throwing,
    onTakeTicket: ticketed,
    playback: planned(),
  },
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

    // 完全 is said once, in the band at the top. Said again under the picture
    // it would be the loudest thing on a screen where nothing is wrong, and
    // the two standings that do change what can be watched would read like it.
    await expect(canvas.getByText('完全')).toBeVisible()
    await expect(canvas.queryByText('録画全体が再生されます')).toBeNull()

    // Nothing is asked for until the play button is pressed, so no transcoder
    // is started for a reader who came to read the record.
    await expect(
      canvasElement.querySelector('video')?.getAttribute('src'),
    ).toBeNull()

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
export const 警告水準: Story = {
  args: { detail: detail('1266') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // The bar carries the whole recording, and the drops sit on it where they
    // fell. Choosing one sends the reader to the second it fell at.
    const bar = canvas.getByRole('slider', { name: '再生位置' })

    await expect(bar).toHaveAttribute('aria-valuemax', '15158')
    await expect(bar).toHaveAttribute('aria-valuetext', '0:00:00 / 4:12:38')

    const spots = canvas.getAllByRole('link', { name: 'この時間帯を再生' })

    await expect(spots[0]).toHaveAttribute('href', '/recordings/1266?at=2580')
  },
}
export const 尻切れ: Story = {
  args: {
    detail: detail('1247'),
    playback: planned({ standing: 'cutShort', showsAsAWholeRecording: false }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Under the picture, where 完全 says nothing: what can be watched is not
    // what was asked for, and the picture itself will not say so.
    await expect(
      canvas.getByText(
        '録画は途中で終わっています。欠けた部分は再生されません',
      ),
    ).toBeVisible()
  },
}
/**
 * Nothing was dropped and the whole stream stayed scrambled, which is a
 * recording that cannot be watched and reads as one. The count is on the
 * record below under スクランブル残存, which is where the notice sends anyone
 * who presses play.
 */
export const スクランブル残存: Story = {
  args: { detail: detail('0906') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('視聴不可の恐れ')).toBeVisible()
    await expect(canvas.getByText('5,042,768 パケット')).toBeVisible()
  },
}
export const 失敗: Story = { args: { detail: detail('1239') } }
export const ファイル不在: Story = { args: { detail: detail('0731') } }
export const 録画中: Story = {
  args: { detail: detail('1291'), playback: refused('stillRecording') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // A recording still being written is not thrown away, and the reason is on
    // the button rather than left for the API to say after the press.
    const remove = canvas.getByRole('button', { name: '削除' })

    await expect(remove).toBeDisabled()
    await expect(remove).toHaveAttribute('title', '録画中は削除できません')

    await expect(canvas.getByText('録画中は再生できません')).toBeVisible()
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
export const 到達できないファイル: Story = {
  args: { detail: detail('1266'), playback: refused('outOfReach') },
}
export const 応答を読めない: Story = {
  args: { detail: detail('1266'), playback: refused('unreadable') },
}
export const 再生できる成果物がない: Story = {
  args: {
    detail: detail('1266'),
    playback: planned({
      standing: 'failed',
      route: 'nothing',
      seeking: undefined,
      transcodes: false,
      showsAsAWholeRecording: false,
    }),
  },
}
export const Range直配信: Story = {
  args: {
    detail: detail('1274'),
    playback: planned({
      route: 'direct',
      seeking: 'byRange',
      canSeek: true,
      transcodes: false,
      bytes: 3_490_550_128,
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // A stream that answers a byte range says nothing about rebuilding, and
    // the note beside the source says what it costs instead.
    await expect(
      canvas.queryByText(
        'シークのたびにトランスコーダを立て直すため、シーク後に絵が出るまで数秒かかります。',
      ),
    ).toBeNull()
    await expect(
      canvas.getByText('エンコード済みを再生しています。'),
    ).toBeVisible()
  },
}
