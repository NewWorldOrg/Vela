import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import type {
  PlaybackChapter,
  PlaybackPlan,
  PlaybackRead,
} from '@/repository/videos'
import type {
  RecordingDiscarded,
  ThumbnailWrite,
} from '@/repository/recordings'
import type { TicketWrite } from '@/repository/tickets'
import type { EncodeWrite } from '@/repository/encode'
import { ENCODE_CHOICES } from '@/repository/encode.fixtures'
import { RecordingDetailView } from '@/components/recordings/recording-detail-page'
import type { FeedRecording } from '@/components/recordings/recording-feed'
import { SKIP_THE_BREAK } from '@/components/recordings/player-skip-break'
import { skipNoted, skips } from '@/stories/noted-skips'
import { RECORDING_DETAIL_FIXTURES } from '@/stories/fixtures/recording-details'
import { drawnFrame } from '@/stories/fixtures/frames'
import { inTheApp } from '@/stories/frames'

const LENGTH = 30 * 60 + 4

const STRETCHES: Omit<PlaybackChapter, 'skippable'>[] = [
  { startsAtSec: 0, endsAtSec: 412.3, kind: 'programme' },
  { startsAtSec: 412.3, endsAtSec: 502.3, kind: 'break' },
  { startsAtSec: 502.3, endsAtSec: 1175.6, kind: 'programme' },
  { startsAtSec: 1175.6, endsAtSec: 1265.6, kind: 'break' },
  { startsAtSec: 1265.6, endsAtSec: LENGTH, kind: 'programme' },
]

const HEAD_SKIP = 14.5

function detail(id: string) {
  const found = RECORDING_DETAIL_FIXTURES.find((r) => r.id === id)

  if (!found) {
    throw new Error(`fixture ${id} not found`)
  }

  return found
}

function chaptersOf(headSkipSec = 0): PlaybackChapter[] {
  return STRETCHES.map((one) => ({
    ...one,
    startsAtSec: Math.max(0, one.startsAtSec - headSkipSec),
    endsAtSec: one.endsAtSec - headSkipSec,
    skippable: one.kind === 'break',
  }))
}

const ON_THE_FLY: PlaybackPlan = {
  standing: 'whole',
  route: 'onTheFly',
  source: 'recording',
  seeking: 'byStartingAgain',
  canSeek: false,
  transcodes: true,
  showsAsAWholeRecording: true,
  mediaType: 'video/mp4',
  sounds: ['main'],
  chapters: chaptersOf(),
  captions: 'none',
  recordingOffsetSec: 0,
}

function planned(over: Partial<PlaybackPlan> = {}): PlaybackRead {
  return { state: 'planned', plan: { ...ON_THE_FLY, ...over } }
}

const ARTEFACT: Partial<PlaybackPlan> = {
  route: 'direct',
  source: 'artefact',
  seeking: 'byRange',
  canSeek: true,
  transcodes: false,
  chapters: chaptersOf(HEAD_SKIP),
}

function stalling() {
  return URL.createObjectURL(new MediaSource())
}

const handedAsItIs: FeedRecording = (video, href) => {
  video.src = href

  return { close: () => {} }
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

async function remade(): Promise<ThumbnailWrite> {
  return { state: 'ok', remake: 'drawn' }
}

async function deleted(): Promise<RecordingDiscarded> {
  return { state: 'ok', filesRemoved: 1 }
}

async function done(): Promise<EncodeWrite> {
  return { state: 'ok' }
}

async function plannedAgain(): Promise<PlaybackRead> {
  return planned()
}

function forgetWhatWasSent() {
  skips.length = 0
}

const meta = {
  title: 'Screens/録画詳細/CM を飛ばす操作',
  component: RecordingDetailView,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/recordings/1274' },
    },
    layout: 'fullscreen',
  },
  args: {
    detail: detail('1274'),
    playback: planned(),
    modelVersion: 3,
    startAt: 420,
    unaskedProfile: '1080p60',
    onRemakeThumbnail: remade,
    onDelete: deleted,
    onTakeTicket: ticketed,
    onAskForTheSound: plannedAgain,
    onKeepPosition: async () => ({ state: 'ok' as const }),
    onQueueEncode: done,
    onCallOffEncode: done,
    encodeChoices: ENCODE_CHOICES,
    onNoteSkip: skipNoted,
    pictureHref: stalling,
    frameHref: drawnFrame,
    feedRecording: handedAsItIs,
  },
  decorators: [inTheApp],
  beforeEach: forgetWhatWasSent,
} satisfies Meta<typeof RecordingDetailView>

export default meta
type Story = StoryObj<typeof meta>

export const CMを飛ばすと操作を送る: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: SKIP_THE_BREAK }))

    await waitFor(() => expect(canvas.getByText('8:22 / 30:04')).toBeVisible())
    await expect(skips).toEqual([
      {
        event: 'skipped',
        kind: 'break',
        fromSec: 420,
        toSec: 502.3,
        modelVersion: 3,
      },
    ])
  },
}

export const CMを飛ばすを閉じると操作を送る: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '閉じる' }))

    await expect(
      canvas.queryByRole('button', { name: SKIP_THE_BREAK }),
    ).toBeNull()
    await expect(skips).toEqual([
      {
        event: 'dismissed',
        kind: 'break',
        fromSec: 420,
        toSec: 502.3,
        modelVersion: 3,
      },
    ])
  },
}

export const モデルのバージョンが無い録画で飛ばすとバージョンを送らない: Story =
  {
    args: { modelVersion: undefined },
    play: async ({ canvasElement }) => {
      await userEvent.click(
        within(canvasElement).getByRole('button', { name: SKIP_THE_BREAK }),
      )

      await waitFor(() => expect(skips).toHaveLength(1))
      await expect(skips[0].modelVersion).toBeUndefined()
    },
  }

export const エンコード済みの再生でも録画の中の時刻で送る: Story = {
  args: {
    playback: planned({ ...ARTEFACT, recordingOffsetSec: HEAD_SKIP }),
    startAt: 405.5,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: SKIP_THE_BREAK }))

    await waitFor(() => expect(canvas.getByText('8:07 / 30:04')).toBeVisible())
    await expect(skips).toEqual([
      {
        event: 'skipped',
        kind: 'break',
        fromSec: 420,
        toSec: 502.3,
        modelVersion: 3,
      },
    ])
  },
}

export const 録画の時刻を置けない再生では飛ばしても操作を送らない: Story = {
  args: {
    playback: planned({ ...ARTEFACT, recordingOffsetSec: undefined }),
    startAt: 405.5,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: SKIP_THE_BREAK }))

    await waitFor(() => expect(canvas.getByText('8:07 / 30:04')).toBeVisible())
    await expect(skips).toEqual([])
  },
}
