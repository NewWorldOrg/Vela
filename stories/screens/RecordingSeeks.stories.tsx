import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

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
import { SKIP_THE } from '@/components/recordings/player-skip'
import { SEEK_STEP_SECONDS } from '@/lib/player-keys'
import { STEPS_JOIN_WITHIN_MS } from '@/lib/seek-events'
import {
  seekNoted,
  seeks,
  seeksWhileLeaving,
  seekSentWhileLeaving,
} from '@/stories/noted-seeks'
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

const FORWARD = `${SEEK_STEP_SECONDS} 秒進む`

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
    skippable: one.kind !== 'programme',
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
  seeks.length = 0
  seeksWhileLeaving.length = 0
  skips.length = 0
}

function longerThanStepsAreJoined() {
  return new Promise((done) => setTimeout(done, STEPS_JOIN_WITHIN_MS + 500))
}

const meta = {
  title: 'Screens/録画詳細/シークを送る',
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
    onNoteSeek: seekNoted,
    onSeekWhileLeaving: seekSentWhileLeaving,
    pictureHref: stalling,
    frameHref: drawnFrame,
    feedRecording: handedAsItIs,
  },
  decorators: [inTheApp],
  beforeEach: forgetWhatWasSent,
} satisfies Meta<typeof RecordingDetailView>

export default meta
type Story = StoryObj<typeof meta>

export const 十秒送りを続けると一つのシークにまとめて送る: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    for (let turn = 0; turn < 3; turn += 1) {
      await userEvent.click(canvas.getByRole('button', { name: FORWARD }))
    }

    await waitFor(() => expect(canvas.getByText('7:30 / 30:04')).toBeVisible())
    await expect(seeks).toEqual([])
    await waitFor(
      () =>
        expect(seeks).toEqual([
          { event: 'forward', means: 'step', fromSec: 420, toSec: 450 },
        ]),
      { timeout: STEPS_JOIN_WITHIN_MS * 2 },
    )
  },
}

export const 次のチャプターへ送るとチャプター送りとして送る: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: '次のチャプターへ' }),
    )

    await waitFor(() => expect(canvas.getByText('8:22 / 30:04')).toBeVisible())
    await expect(seeks).toEqual([
      { event: 'forward', means: 'chapter', fromSec: 420, toSec: 502.3 },
    ])
  },
}

export const エンコード済みの再生でもシークを録画の中の時刻で送る: Story = {
  args: {
    playback: planned({
      route: 'direct',
      source: 'artefact',
      seeking: 'byRange',
      canSeek: true,
      transcodes: false,
      chapters: chaptersOf(HEAD_SKIP),
      recordingOffsetSec: HEAD_SKIP,
    }),
    startAt: 405.5,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: '次のチャプターへ' }),
    )

    await waitFor(() => expect(canvas.getByText('8:07 / 30:04')).toBeVisible())
    await expect(seeks).toEqual([
      { event: 'forward', means: 'chapter', fromSec: 420, toSec: 502.3 },
    ])
  },
}

export const 速度を上げているとシークを送らない: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '設定' }))
    await userEvent.click(
      within(await screen.findByRole('group', { name: '速度' })).getByRole(
        'button',
        { name: '1.5' },
      ),
    )
    await userEvent.keyboard('{Escape}')

    for (let turn = 0; turn < 2; turn += 1) {
      await userEvent.click(canvas.getByRole('button', { name: FORWARD }))
    }

    await userEvent.click(
      canvas.getByRole('button', { name: '次のチャプターへ' }),
    )
    await waitFor(() => expect(canvas.getByText('8:22 / 30:04')).toBeVisible())
    await longerThanStepsAreJoined()
    await expect(seeks).toEqual([])
  },
}

export const 飛ばすボタンで飛ばしてもシークは送らない: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: SKIP_THE.break }))

    await waitFor(() => expect(canvas.getByText('8:22 / 30:04')).toBeVisible())
    await longerThanStepsAreJoined()
    await expect(skips).toHaveLength(1)
    await expect(seeks).toEqual([])
  },
}

export const シークバーの矢印キーとページ送りはキーとしてまとめて送る: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    canvas.getByRole('slider', { name: '再生位置' }).focus()
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{PageUp}')

    await waitFor(() => expect(canvas.getByText('8:20 / 30:04')).toBeVisible())
    await expect(seeks).toEqual([])
    await waitFor(
      () =>
        expect(seeks).toEqual([
          { event: 'forward', means: 'key', fromSec: 420, toSec: 500 },
        ]),
      { timeout: STEPS_JOIN_WITHIN_MS * 2 },
    )
  },
}

export const ページを閉じるとまとめ待ちのシークをページの後まで届く形で送る: Story =
  {
    play: async ({ canvasElement }) => {
      const canvas = within(canvasElement)

      for (let turn = 0; turn < 2; turn += 1) {
        await userEvent.click(canvas.getByRole('button', { name: FORWARD }))
      }

      await waitFor(() =>
        expect(canvas.getByText('7:20 / 30:04')).toBeVisible(),
      )
      window.dispatchEvent(new Event('pagehide'))

      await expect(seeksWhileLeaving).toEqual([
        { event: 'forward', means: 'step', fromSec: 420, toSec: 440 },
      ])
      await longerThanStepsAreJoined()
      await expect(seeks).toEqual([])
      await expect(seeksWhileLeaving).toHaveLength(1)
    },
  }

export const ページが裏に回るとまとめ待ちのシークをページの後まで届く形で送る: Story =
  {
    play: async ({ canvasElement }) => {
      const canvas = within(canvasElement)

      for (let turn = 0; turn < 2; turn += 1) {
        await userEvent.click(canvas.getByRole('button', { name: FORWARD }))
      }

      await waitFor(() =>
        expect(canvas.getByText('7:20 / 30:04')).toBeVisible(),
      )
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      })

      try {
        document.dispatchEvent(new Event('visibilitychange'))
      } finally {
        Reflect.deleteProperty(document, 'visibilityState')
      }

      await expect(seeksWhileLeaving).toEqual([
        { event: 'forward', means: 'step', fromSec: 420, toSec: 440 },
      ])
      await longerThanStepsAreJoined()
      await expect(seeks).toEqual([])
    },
  }
