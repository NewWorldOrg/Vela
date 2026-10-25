import { useSyncExternalStore, type ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'
import { getRouter } from '@storybook/nextjs/navigation.mock'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import type {
  PlaybackChapter,
  PlaybackPlan,
  PlaybackRead,
} from '@/repository/videos'
import type { TicketWrite } from '@/repository/tickets'
import type { PlaybackSource } from '@/repository/playback-sources'
import type { SoundTrack } from '@/repository/sounds'
import {
  THE_SOUNDS_COULD_NOT_BE_READ,
  videoPictureHref,
  type PlaybackProfile,
} from '@/repository/video-paths'
import { RECORDING_DETAIL_FIXTURES } from '@/stories/fixtures/recording-details'
import {
  DRAWN_PICTURE,
  drawnFrame,
  SUBTITLED_FRAME,
} from '@/stories/fixtures/frames'
import { Player } from '@/components/recordings/player'
import type { ReadCaptions } from '@/components/recordings/read-captions'
import type { CaptionWindow } from '@/lib/recording-captions'
import type { CaptionPicture } from '@/lib/live-wire'
import { containedIn, placedOn } from '@/lib/caption-placement'
import { CAPTION_STYLE_COOKIE } from '@/lib/caption-style'
import { cookieIn } from '@/lib/stored-flag'
import {
  whiteOnASolidBand,
  whiteWithNoBand,
} from '@/stories/fixtures/caption-pictures'
import {
  CAPTION_CANVAS_FIXTURE,
  CAPTION_PICTURE_FIXTURE,
} from '@/stories/fixtures/captions'
import { PlayerSeat } from '@/components/recordings/player-seat'
import {
  drawCapture,
  type TakeCapture,
} from '@/components/recordings/take-capture'
import { ScreenMain } from '@/components/vela/app-shell'
import { fillsTheWindowWithoutElementFullscreen } from '@/stories/fills-the-window'
import type { PlaybackFault } from '@/components/recordings/playback-fault'
import type {
  FeedRecording,
  RecordingFeedEvents,
} from '@/components/recordings/recording-feed'
import type { DataBroadcastRead } from '@/repository/video-data-broadcast'
import type { ReadDataBroadcast } from '@/components/recordings/read-data-broadcast'
import {
  DATA_BROADCAST_CATALOG,
  PROGRAMME_READING_CATALOG,
  dataBroadcastModules,
  programmeReadingModules,
  relativeTimeModules,
} from '@/stories/fixtures/data-broadcast'
import {
  readingModulesOf,
  throughout,
} from '@/stories/fixtures/recording-data-broadcast'

function detail(id: string) {
  const found = RECORDING_DETAIL_FIXTURES.find((r) => r.id === id)
  if (!found) {
    throw new Error(`fixture ${id} not found`)
  }
  return found
}

const ON_THE_FLY: PlaybackPlan = {
  standing: 'whole',
  route: 'onTheFly',
  seeking: 'byStartingAgain',
  canSeek: false,
  transcodes: true,
  showsAsAWholeRecording: true,
  mediaType: 'video/mp4',
  sounds: ['main'],
  chapters: [],
  captions: 'none',
}

const IN_TWO_LANGUAGES: PlaybackPlan = {
  ...ON_THE_FLY,
  sounds: ['main', 'secondary'],
}

const BILINGUAL_BESIDE_A_SECOND_SOUND: PlaybackPlan = {
  ...ON_THE_FLY,
  sounds: ['main', 'secondary', 'third'],
}

const HANDED_OVER: PlaybackPlan = {
  ...ON_THE_FLY,
  route: 'direct',
  seeking: 'byRange',
  canSeek: true,
  transcodes: false,
  bytes: 3_490_550_128,
}

const HANDED_OVER_IN_TWO_LANGUAGES: PlaybackPlan = {
  ...HANDED_OVER,
  sounds: ['main', 'secondary'],
}

const WITH_AN_ARTEFACT: PlaybackPlan = {
  ...HANDED_OVER,
  source: 'artefact',
  alternative: 'recording',
}

const THE_RECORDING_ITSELF: PlaybackPlan = {
  ...ON_THE_FLY,
  source: 'recording',
  alternative: 'artefact',
}

const THE_RECORDING_ITSELF_IN_TWO_LANGUAGES: PlaybackPlan = {
  ...THE_RECORDING_ITSELF,
  sounds: ['main', 'secondary'],
}

const NOTHING_WAS_ENCODED: PlaybackPlan = {
  ...ON_THE_FLY,
  source: 'recording',
}

const MARKED_CHAPTERS: PlaybackChapter[] = [
  { startsAtSec: 0, endsAtSec: 1200, kind: 'programme', skippable: false },
  { startsAtSec: 1200, endsAtSec: 1320, kind: 'break', skippable: true },
  { startsAtSec: 1320, endsAtSec: 3600, kind: 'programme', skippable: false },
  { startsAtSec: 3600, endsAtSec: 3750, kind: 'break', skippable: true },
  { startsAtSec: 3750, endsAtSec: 15158, kind: 'programme', skippable: false },
]

const MARKED: PlaybackPlan = {
  ...HANDED_OVER,
  chapters: MARKED_CHAPTERS,
}

const MARKED_BUT_NOT_TO_SKIP: PlaybackPlan = {
  ...HANDED_OVER,
  chapters: MARKED_CHAPTERS.map((one) => ({ ...one, skippable: false })),
}

const THE_RECORDING_ITSELF_MARKED: PlaybackPlan = {
  ...THE_RECORDING_ITSELF,
  chapters: MARKED_CHAPTERS,
}

const MARKED_WITH_AN_UNKNOWN_KIND: PlaybackPlan = {
  ...HANDED_OVER,
  chapters: [
    { startsAtSec: 0, endsAtSec: 1200, kind: 'programme', skippable: false },
    { startsAtSec: 1200, endsAtSec: 1320, kind: 'unknown', skippable: true },
    { startsAtSec: 1320, endsAtSec: 3600, kind: 'programme', skippable: false },
    { startsAtSec: 3600, endsAtSec: 3750, kind: 'break', skippable: true },
    {
      startsAtSec: 3750,
      endsAtSec: 15158,
      kind: 'programme',
      skippable: false,
    },
  ],
}

const ENDS_IN_A_BREAK: PlaybackPlan = {
  ...HANDED_OVER,
  chapters: [
    { startsAtSec: 0, endsAtSec: 14800, kind: 'programme', skippable: false },
    { startsAtSec: 14800, endsAtSec: 15158, kind: 'break', skippable: false },
  ],
}

const THEMED_CHAPTERS: PlaybackChapter[] = [
  { startsAtSec: 0, endsAtSec: 90, kind: 'programme', skippable: false },
  { startsAtSec: 90, endsAtSec: 180, kind: 'opening', skippable: true },
  { startsAtSec: 180, endsAtSec: 1200, kind: 'programme', skippable: false },
  { startsAtSec: 1200, endsAtSec: 1320, kind: 'break', skippable: true },
  { startsAtSec: 1320, endsAtSec: 14800, kind: 'programme', skippable: false },
  { startsAtSec: 14800, endsAtSec: 14890, kind: 'ending', skippable: true },
  { startsAtSec: 14890, endsAtSec: 15158, kind: 'programme', skippable: false },
]

const THEMED: PlaybackPlan = {
  ...HANDED_OVER,
  chapters: THEMED_CHAPTERS,
}

const THEMED_BUT_NOT_TO_SKIP: PlaybackPlan = {
  ...HANDED_OVER,
  chapters: THEMED_CHAPTERS.map((one) => ({ ...one, skippable: false })),
}

const THE_RECORDING_ITSELF_THEMED: PlaybackPlan = {
  ...THE_RECORDING_ITSELF,
  chapters: THEMED_CHAPTERS,
}

const OPENING_THEN_A_BREAK: PlaybackPlan = {
  ...HANDED_OVER,
  chapters: [
    { startsAtSec: 0, endsAtSec: 90, kind: 'programme', skippable: false },
    { startsAtSec: 90, endsAtSec: 180, kind: 'opening', skippable: true },
    { startsAtSec: 180, endsAtSec: 240, kind: 'break', skippable: true },
    { startsAtSec: 240, endsAtSec: 15158, kind: 'programme', skippable: false },
  ],
}

const OPENING_THEN_A_HELD_BACK_BREAK: PlaybackPlan = {
  ...HANDED_OVER,
  chapters: [
    { startsAtSec: 0, endsAtSec: 90, kind: 'programme', skippable: false },
    { startsAtSec: 90, endsAtSec: 180, kind: 'opening', skippable: true },
    { startsAtSec: 180, endsAtSec: 240, kind: 'break', skippable: false },
    { startsAtSec: 240, endsAtSec: 300, kind: 'break', skippable: true },
    { startsAtSec: 300, endsAtSec: 15158, kind: 'programme', skippable: false },
  ],
}

const OPENING_BREAK_AND_ENDING: PlaybackPlan = {
  ...HANDED_OVER,
  chapters: [
    { startsAtSec: 0, endsAtSec: 90, kind: 'programme', skippable: false },
    { startsAtSec: 90, endsAtSec: 180, kind: 'opening', skippable: true },
    { startsAtSec: 180, endsAtSec: 240, kind: 'break', skippable: true },
    { startsAtSec: 240, endsAtSec: 330, kind: 'ending', skippable: true },
    { startsAtSec: 330, endsAtSec: 15158, kind: 'programme', skippable: false },
  ],
}

const BREAKS_BACK_TO_BACK: PlaybackPlan = {
  ...HANDED_OVER,
  chapters: [
    { startsAtSec: 0, endsAtSec: 1200, kind: 'programme', skippable: false },
    { startsAtSec: 1200, endsAtSec: 1230, kind: 'break', skippable: true },
    { startsAtSec: 1230, endsAtSec: 1290, kind: 'break', skippable: true },
    {
      startsAtSec: 1290,
      endsAtSec: 15158,
      kind: 'programme',
      skippable: false,
    },
  ],
}

const ENDS_IN_AN_ENDING: PlaybackPlan = {
  ...HANDED_OVER,
  chapters: [
    { startsAtSec: 0, endsAtSec: 15000, kind: 'programme', skippable: false },
    { startsAtSec: 15000, endsAtSec: 15158, kind: 'ending', skippable: false },
  ],
}

const NEXT_CHAPTER = '次のチャプターへ'

const SKIP_THE_BREAK = 'CM を飛ばす'

const SKIP_THE_OPENING = 'OP を飛ばす'

const SKIP_THE_ENDING = 'ED を飛ばす'

const SKIP_THE_OPENING_AND_THE_BREAK = 'OP と CM を飛ばす'

const SKIP_ONLY = '飛ばす'

const ANY_SKIP = /^(CM|OP|ED)( と (CM|OP|ED))* を飛ばす$/

function marksOn(canvasElement: HTMLElement, named: string) {
  return canvasElement.querySelectorAll(`[title="${named}"]`).length
}

const reasked: SoundTrack[] = []

function planning(answer: PlaybackPlan) {
  return async (id: string, sound: SoundTrack): Promise<PlaybackRead> => {
    reasked.push(sound)

    return { state: 'planned', plan: answer }
  }
}

const theAnswer: { lands?: (read: PlaybackRead) => void } = {}

function heldOpen(id: string, sound: SoundTrack): Promise<PlaybackRead> {
  reasked.push(sound)

  return new Promise<PlaybackRead>((settle) => {
    theAnswer.lands = settle
  })
}

async function throwingOnTheSound(
  id: string,
  sound: SoundTrack,
): Promise<PlaybackRead> {
  reasked.push(sound)

  throw new Error('the plan could not be asked for')
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

function withoutFrames() {
  return '/frames/none-of-them.jpg'
}

function noPicture() {
  return '/pictures/there-is-none.mp4'
}

function stalling() {
  return URL.createObjectURL(new MediaSource())
}

const asked: string[] = []

function keeping(id: string, from: number, profile?: string) {
  asked.push(`${from}/${profile ?? '—'}`)

  return stalling()
}

function carrying(id: string, from: number, profile?: string, sound?: string) {
  asked.push(`${from}/${profile ?? '—'}/${sound ?? '—'}`)

  return stalling()
}

const handed: string[] = []

function carryingTheSource(
  id: string,
  from: number,
  profile?: PlaybackProfile,
  sound?: SoundTrack,
  source?: PlaybackSource,
) {
  asked.push(videoPictureHref(id, from, profile, sound, source))

  const href = stalling()

  handed.push(href)

  return href
}

const reaskedWith: string[] = []

function planningWithTheSource(answer: PlaybackPlan) {
  return async (
    id: string,
    sound: SoundTrack,
    source?: PlaybackSource,
  ): Promise<PlaybackRead> => {
    reaskedWith.push(`${sound}/${source ?? '—'}`)

    return { state: 'planned', plan: answer }
  }
}

const handedAsItIs: FeedRecording = (video, href) => {
  video.src = href

  return { close: () => {} }
}

const fed: string[] = []

const feeding: { events?: RecordingFeedEvents } = {}

function naming(
  id: string,
  from: number,
  profile?: PlaybackProfile,
  sound?: SoundTrack,
  source?: PlaybackSource,
) {
  return videoPictureHref(id, from, profile, sound, source)
}

const keptForTheFeed: FeedRecording = (_video, href, events) => {
  fed.push(href)
  feeding.events = events

  return { close: () => {} }
}

function answering(fault: PlaybackFault) {
  return async () => fault
}

function scrub(canvasElement: HTMLElement, share: number) {
  const bar = within(canvasElement).getByRole('slider', { name: '再生位置' })
  const box = bar.getBoundingClientRect()

  bar.dispatchEvent(
    new PointerEvent('pointermove', {
      clientX: box.left + box.width * share,
      clientY: box.top + box.height / 2,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      bubbles: true,
    }),
  )
}

const READING = /^\d+:\d\d(:\d\d)?$/

const kept: number[] = []

async function keepingThePosition(id: string, positionSec: number) {
  kept.push(positionSec)

  return { state: 'ok' as const }
}

const meta = {
  title: 'Components/録画プレイヤー',
  component: Player,
  parameters: { layout: 'fullscreen' },
  args: {
    detail: detail('1266'),
    plan: ON_THE_FLY,
    unaskedProfile: '1080p60',
    onTakeTicket: ticketed,
    onAskForTheSound: planning(ON_THE_FLY),
    onKeepPosition: keepingThePosition,
    frameHref: drawnFrame,
    feedRecording: handedAsItIs,
  },
  decorators: [
    (Story) => (
      <div className="bg-bg py-6">
        <ScreenMain className="px-[calc(30rem/16)] max-[1060px]:px-5 max-[700px]:px-3.5">
          <Story />
        </ScreenMain>
      </div>
    ),
  ],
} satisfies Meta<typeof Player>

export default meta
type Story = StoryObj<typeof meta>

export const 待機中: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('0:00 / 4:12:38')).toBeVisible()
    await expect(canvas.queryByText(/トランスコーダ/)).toBeNull()
  },
}

export const スクラブ: Story = {
  play: async ({ canvasElement }) => {
    scrub(canvasElement, 0.52)

    const canvas = within(canvasElement)

    await waitFor(() => expect(canvas.getByText(READING)).toBeVisible())
    await waitFor(() =>
      expect(canvasElement.querySelectorAll('img').length).toBe(1),
    )
  },
}

export const フレームを持たない録画: Story = {
  args: { frameHref: withoutFrames },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    scrub(canvasElement, 0.52)
    await waitFor(() => expect(canvas.getByText(READING)).toBeVisible())

    await waitFor(() =>
      expect(
        canvasElement.querySelector('img[src*="none-of-them"]'),
      ).toBeNull(),
    )

    scrub(canvasElement, 0.72)
    await waitFor(() => expect(canvas.getByText(READING)).toBeVisible())
    await expect(canvasElement.querySelectorAll('img').length).toBe(0)
  },
}

export const 尻切れ: Story = {
  args: {
    detail: detail('1247'),
    plan: {
      ...ON_THE_FLY,
      standing: 'cutShort',
      showsAsAWholeRecording: false,
    },
  },
}

export const Range直配信: Story = {
  args: {
    detail: detail('1274'),
    plan: {
      ...ON_THE_FLY,
      route: 'direct',
      seeking: 'byRange',
      canSeek: true,
      transcodes: false,
      bytes: 3_490_550_128,
    },
  },
}

export const 再生できない_スクランブル残存: Story = {
  args: {
    detail: detail('0906'),
    startAt: 0,
    pictureHref: noPicture,
    askWhy: answering({ kind: 'transcode' }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() =>
      expect(canvas.getByText('スクランブルが解けていません')).toBeVisible(),
    )
    await expect(
      canvas.getByText(/時間をおいても再生できるようにはなりません/),
    ).toBeVisible()

    await expect(canvas.queryByRole('button', { name: '再試行' })).toBeNull()
  },
}

export const 再生できない_スクランブル解除済み: Story = {
  args: {
    detail: { ...detail('0906'), leftScrambled: false },
    startAt: 0,
    pictureHref: noPicture,
    askWhy: answering({ kind: 'transcode' }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() =>
      expect(canvas.getByText('再生を開始できませんでした')).toBeVisible(),
    )
    await expect(canvas.queryByText('スクランブルが解けていません')).toBeNull()
  },
}

export const 再生できない_同時視聴の上限: Story = {
  args: {
    detail: detail('1266'),
    startAt: 0,
    pictureHref: noPicture,
    askWhy: answering({ kind: 'tooManyAtOnce' }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() =>
      expect(
        canvas.getByText('同時に再生できる本数の上限に達しています'),
      ).toBeVisible(),
    )
    await expect(canvas.getByRole('button', { name: '再試行' })).toBeEnabled()
  },
}

export const 再生できない_トランスコード失敗: Story = {
  args: {
    detail: detail('1266'),
    startAt: 0,
    pictureHref: noPicture,
    askWhy: answering({ kind: 'transcode' }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() =>
      expect(canvas.getByText('再生を開始できませんでした')).toBeVisible(),
    )
    await expect(
      canvas.getByText('元 TS からのトランスコードに失敗しました。'),
    ).toBeVisible()
  },
}

export const 再生できない_外部プレイヤーは渡すものを選べる: Story = {
  args: {
    detail: detail('1274'),
    plan: WITH_AN_ARTEFACT,
    startAt: 0,
    pictureHref: noPicture,
    askWhy: answering({ kind: 'undecodable' }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() =>
      expect(
        canvas.getByText('このブラウザーでは再生できません'),
      ).toBeVisible(),
    )
    await userEvent.click(
      canvas.getByRole('button', { name: '外部プレイヤーで再生' }),
    )
    await expect(await screen.findByRole('menu')).toBeVisible()
    await expect(
      screen.getAllByRole('menuitemradio').map((one) => one.textContent),
    ).toEqual(['エンコード版', '元のまま3.4 GB'])
    await expect(
      screen.getAllByRole('menuitem').map((one) => one.textContent),
    ).toEqual(['URL をコピー'])
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
  },
}

export const エンコード済みがある録画は_AirPlay_を置く: Story = {
  args: { detail: detail('1274'), plan: WITH_AN_ARTEFACT },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('button', { name: 'AirPlay' }),
    ).toBeVisible()
  },
}

export const 元のままを再生しているあいだは_AirPlay_を置かない: Story = {
  args: { detail: detail('1274'), plan: THE_RECORDING_ITSELF },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole('button', { name: '設定' })).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'AirPlay' })).toBeNull()
  },
}

export const 元のままは映像のアドレスにせず受け取って流す: Story = {
  args: {
    detail: detail('1274'),
    plan: THE_RECORDING_ITSELF,
    startAt: 0,
    pictureHref: carryingTheSource,
    feedRecording: keptForTheFeed,
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(fed.at(-1)).toBe(handed.at(-1)))
    await expect(
      canvasElement.querySelector('video')?.getAttribute('src'),
    ).toBeNull()
  },
}

export const エンコード済みは映像のアドレスに渡す: Story = {
  args: {
    detail: detail('1274'),
    plan: WITH_AN_ARTEFACT,
    startAt: 0,
    pictureHref: carryingTheSource,
    feedRecording: keptForTheFeed,
  },
  play: async ({ canvasElement }) => {
    fed.length = 0

    await expect(canvasElement.querySelector('video')).toHaveAttribute(
      'src',
      handed.at(-1),
    )
    await expect(fed).toEqual([])
  },
}

export const 受け取れなかったら理由を確かめて言う: Story = {
  args: {
    detail: detail('1266'),
    startAt: 0,
    pictureHref: carryingTheSource,
    feedRecording: keptForTheFeed,
    askWhy: answering({ kind: 'tooManyAtOnce' }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => expect(fed.at(-1)).toBe(handed.at(-1)))
    feeding.events?.onFault()
    await waitFor(() =>
      expect(
        canvas.getByText('同時に再生できる本数の上限に達しています'),
      ).toBeVisible(),
    )
  },
}

export const 変換した映像をブラウザが再生できなかったら_変換の失敗とは言わない: Story =
  {
    args: {
      detail: detail('1266'),
      startAt: 0,
      pictureHref: () => '/pwa/icon-192.png',
      feedRecording: keptForTheFeed,
    },
    play: async ({ canvasElement }) => {
      const canvas = within(canvasElement)

      await waitFor(() => expect(fed.at(-1)).toBe('/pwa/icon-192.png'))
      feeding.events?.onFault()
      await waitFor(() =>
        expect(
          canvas.getByText('このブラウザーでは再生できません'),
        ).toBeVisible(),
      )
      await expect(
        canvas.getByText(
          'トランスコードした映像をこのブラウザーが再生できませんでした。',
        ),
      ).toBeVisible()
      await expect(
        canvas.queryByText('元 TS からのトランスコードに失敗しました。'),
      ).toBeNull()
      await expect(canvas.queryByRole('button', { name: '再試行' })).toBeNull()
    },
  }

export const 止めているあいだに受け取りが切れたら_次の再生でその秒から開き直す: Story =
  {
    args: {
      detail: detail('1266'),
      startAt: 600,
      pictureHref: naming,
      feedRecording: keptForTheFeed,
    },
    play: async ({ canvasElement }) => {
      const canvas = within(canvasElement)
      const first = videoPictureHref('1266', 600, '1080p60')

      await waitFor(() => expect(fed.at(-1)).toBe(first))

      const opened = fed.length

      feeding.events?.onCut()
      await expect(fed.length).toBe(opened)

      await userEvent.click(
        canvas.getAllByRole('button', { name: '再生' }).at(-1) as HTMLElement,
      )
      await waitFor(() => expect(fed.length).toBe(opened + 1))
      await expect(fed.at(-1)).toBe(first)
    },
  }

export const エンコード済みが無い録画は_AirPlay_を置かない: Story = {
  args: { detail: detail('1266'), plan: NOTHING_WAS_ENCODED },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.queryByRole('button', { name: 'AirPlay' })).toBeNull()
  },
}

export const 読み込み中: Story = {
  args: {
    detail: { ...detail('1266'), thumbnailHref: SUBTITLED_FRAME },
    startAt: 0,
    pictureHref: stalling,
  },
  play: async ({ canvasElement }) => {
    const plate = within(canvasElement).getByRole('status')

    await expect(plate).toBeVisible()
    await expect(plate.querySelector('[data-slot="spinner"]')).not.toBeNull()
    await expect(plate.textContent).toBe('')
  },
}

export const 機械が1080p60と答える: Story = {
  args: {
    detail: detail('1266'),
    startAt: 0,
    unaskedProfile: '1080p60',
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => expect(asked.at(-1)).toBe('0/1080p60'))
    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const quality = await screen.findByRole('group', { name: '画質' })

    await expect(
      within(quality).getByRole('button', { name: '1080p60' }),
    ).toHaveAttribute('aria-pressed', 'true')
  },
}

export const 機械が720p30と答える: Story = {
  args: {
    detail: detail('1266'),
    startAt: 0,
    unaskedProfile: '720p30',
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => expect(asked.at(-1)).toBe('0/720p30'))
    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const quality = await screen.findByRole('group', { name: '画質' })

    await expect(
      within(quality).getByRole('button', { name: '720p30' }),
    ).toHaveAttribute('aria-pressed', 'true')
  },
}

export const 機械に聞けなければ何も指定しない: Story = {
  args: {
    detail: detail('1266'),
    startAt: 0,
    unaskedProfile: undefined,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => expect(asked.at(-1)).toBe('0/—'))
    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const quality = await screen.findByRole('group', { name: '画質' })

    await expect(
      within(quality)
        .getAllByRole('button')
        .map((one) => one.getAttribute('aria-pressed')),
    ).toEqual(['false', 'false', 'false', 'false'])
  },
}

export const 画質を選ぶ: Story = {
  args: {
    detail: detail('1266'),
    startAt: 0,
    unaskedProfile: '1080p60',
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const quality = await screen.findByRole('group', { name: '画質' })

    await expect(
      within(quality)
        .getAllByRole('button')
        .map((one) => one.textContent),
    ).toEqual(['1080p60', '1080p30', '720p60', '720p30'])
    await expect(
      within(quality).getByRole('button', { name: '1080p60' }),
    ).toHaveAttribute('aria-pressed', 'true')

    asked.length = 0
    await userEvent.click(
      within(quality).getByRole('button', { name: '720p60' }),
    )

    await waitFor(() => expect(asked).toEqual(['0/720p60']))
    await expect(
      within(quality).getByRole('button', { name: '720p60' }),
    ).toHaveAttribute('aria-pressed', 'true')
  },
}

export const 効かない操作子: Story = {
  args: { detail: detail('1266') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.queryByRole('button', { name: '字幕' })).toBeNull()

    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const settings = await screen.findByRole('dialog', { name: '設定' })

    await within(settings).findByRole('group', { name: '画質' })
    await expect(within(settings).queryByText('字幕')).toBeNull()
    await expect(
      within(settings).queryByText(/選べます|実装されます/),
    ).toBeNull()
  },
}

export const オンザフライでない録画の画質は押せない: Story = {
  args: {
    detail: detail('1274'),
    plan: HANDED_OVER_IN_TWO_LANGUAGES,
    startAt: 0,
    pictureHref: carrying,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const settings = await screen.findByRole('dialog', { name: '設定' })
    const quality = await within(settings).findByRole('group', {
      name: '画質',
    })

    for (const one of within(quality).getAllByRole('button')) {
      await expect(one).toBeDisabled()
      await expect(one).not.toHaveAttribute('title')
    }

    await expect(
      within(settings).queryByText(/選べます|実装されます/),
    ).toBeNull()
  },
}

export const 音声が一つの録画に音声の行は無い: Story = {
  args: { detail: detail('1266'), startAt: 0, pictureHref: carrying },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => expect(asked.at(-1)).toBe('0/1080p60/—'))
    await userEvent.click(canvas.getByRole('button', { name: '設定' }))
    await screen.findByRole('group', { name: '画質' })

    await expect(screen.queryByRole('group', { name: '音声' })).toBeNull()
  },
}

export const 二つの音声を持つ録画は音声を選べる: Story = {
  args: {
    detail: detail('1266'),
    plan: IN_TWO_LANGUAGES,
    startAt: 0,
    unaskedProfile: '1080p60',
    pictureHref: carrying,
    onAskForTheSound: planning(IN_TWO_LANGUAGES),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => expect(asked.at(-1)).toBe('0/1080p60/main'))
    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const sounds = await screen.findByRole('group', { name: '音声' })

    await expect(
      within(sounds)
        .getAllByRole('button')
        .map((one) => one.textContent),
    ).toEqual(['主音声', '副音声'])
    await expect(
      within(sounds).getByRole('button', { name: '主音声' }),
    ).toHaveAttribute('aria-pressed', 'true')
  },
}

export const 副音声を選ぶと副音声で再生し直す: Story = {
  args: {
    detail: detail('1266'),
    plan: IN_TWO_LANGUAGES,
    startAt: 0,
    unaskedProfile: '1080p60',
    pictureHref: carrying,
    onAskForTheSound: planning(IN_TWO_LANGUAGES),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const sounds = await screen.findByRole('group', { name: '音声' })

    asked.length = 0
    reasked.length = 0
    await userEvent.click(
      within(sounds).getByRole('button', { name: '副音声' }),
    )

    await waitFor(() => expect(reasked).toEqual(['secondary']))
    await waitFor(() => expect(asked).toEqual(['0/1080p60/secondary']))
    await expect(
      within(sounds).getByRole('button', { name: '副音声' }),
    ).toHaveAttribute('aria-pressed', 'true')
  },
}

export const 二か国語の主音声と別の音声を持つ録画は音声を三つから選べる: Story =
  {
    args: {
      detail: detail('1266'),
      plan: BILINGUAL_BESIDE_A_SECOND_SOUND,
      startAt: 0,
      unaskedProfile: '1080p60',
      pictureHref: carrying,
      onAskForTheSound: planning(BILINGUAL_BESIDE_A_SECOND_SOUND),
    },
    play: async ({ canvasElement }) => {
      const canvas = within(canvasElement)

      await waitFor(() => expect(asked.at(-1)).toBe('0/1080p60/main'))
      await userEvent.click(canvas.getByRole('button', { name: '設定' }))

      const sounds = await screen.findByRole('group', { name: '音声' })

      await expect(
        within(sounds)
          .getAllByRole('button')
          .map((one) => one.textContent),
      ).toEqual(['主音声', '副音声', '第2音声'])

      asked.length = 0
      reasked.length = 0
      await userEvent.click(
        within(sounds).getByRole('button', { name: '第2音声' }),
      )

      await waitFor(() => expect(reasked).toEqual(['third']))
      await waitFor(() => expect(asked).toEqual(['0/1080p60/third']))
      await expect(
        within(sounds).getByRole('button', { name: '第2音声' }),
      ).toHaveAttribute('aria-pressed', 'true')
    },
  }

export const 成果物を直に渡す録画でも音声を選べる: Story = {
  args: {
    detail: detail('1274'),
    plan: HANDED_OVER_IN_TWO_LANGUAGES,
    startAt: 0,
    unaskedProfile: '1080p60',
    pictureHref: carrying,
    onAskForTheSound: planning(IN_TWO_LANGUAGES),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => expect(asked.at(-1)).toBe('0/—/main'))
    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const sounds = await screen.findByRole('group', { name: '音声' })

    await expect(
      within(sounds).getByRole('button', { name: '主音声' }),
    ).toHaveAttribute('aria-pressed', 'true')

    asked.length = 0
    reasked.length = 0
    await userEvent.click(
      within(sounds).getByRole('button', { name: '副音声' }),
    )

    await waitFor(() => expect(reasked).toEqual(['secondary']))
    await waitFor(() => expect(asked).toEqual(['0/1080p60/secondary']))
    await expect(
      within(sounds).getByRole('button', { name: '副音声' }),
    ).toHaveAttribute('aria-pressed', 'true')
  },
}

export const 素材に届かない録画は副音声を諦めて主音声に戻る: Story = {
  args: {
    detail: detail('1274'),
    plan: HANDED_OVER_IN_TWO_LANGUAGES,
    startAt: 0,
    unaskedProfile: '1080p60',
    pictureHref: carrying,
    onAskForTheSound: planning(HANDED_OVER),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const sounds = await screen.findByRole('group', { name: '音声' })

    asked.length = 0
    reasked.length = 0
    await userEvent.click(
      within(sounds).getByRole('button', { name: '副音声' }),
    )

    await waitFor(() => expect(reasked).toEqual(['secondary']))
    await waitFor(() =>
      expect(screen.queryByRole('group', { name: '音声' })).toBeNull(),
    )
    await expect(canvas.getByText(THE_SOUNDS_COULD_NOT_BE_READ)).toBeVisible()
    await expect(asked).toEqual([])
  },
}

const AT_1274 = '/recordings/1274'

export const 成果物がある録画は元のままにも切り替えられる: Story = {
  args: {
    detail: detail('1274'),
    plan: WITH_AN_ARTEFACT,
    startAt: 0,
    pictureHref: carryingTheSource,
  },
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: AT_1274 } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const router = getRouter()

    await waitFor(() =>
      expect(asked.at(-1)).toBe('/api/videos/1274/play?from=0&source=artefact'),
    )
    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const sources = await screen.findByRole('group', { name: 'ソース' })

    await expect(
      within(sources)
        .getAllByRole('button')
        .map((one) => one.textContent),
    ).toEqual(['エンコード版', '元のまま'])
    await expect(
      within(sources).getByRole('button', { name: 'エンコード版' }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(
      within(sources).getByRole('button', { name: '元のまま' }),
    ).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(
      within(sources).getByRole('button', { name: '元のまま' }),
    )

    await expect(router.replace).toHaveBeenCalledWith(
      `${AT_1274}?at=0&source=recording`,
      { scroll: false },
    )
  },
}

export const 元のままを再生している録画はエンコード済みに戻せる: Story = {
  args: {
    detail: detail('1274'),
    plan: THE_RECORDING_ITSELF,
    startAt: 0,
    unaskedProfile: '1080p60',
    pictureHref: carryingTheSource,
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: AT_1274, query: { source: 'recording' } },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const router = getRouter()

    await waitFor(() =>
      expect(asked.at(-1)).toBe(
        '/api/videos/1274/play?from=0&profile=1080p60&source=recording',
      ),
    )
    await waitFor(() =>
      expect(canvasElement.querySelector('video')).toHaveAttribute(
        'src',
        handed.at(-1),
      ),
    )

    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const sources = await screen.findByRole('group', { name: 'ソース' })

    await expect(
      within(sources).getByRole('button', { name: '元のまま' }),
    ).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(
      within(sources).getByRole('button', { name: 'エンコード版' }),
    )

    await expect(router.replace).toHaveBeenCalledWith(`${AT_1274}?at=0`, {
      scroll: false,
    })
  },
}

export const ソースを切り替えても観ていた秒から続く: Story = {
  args: {
    detail: detail('1274'),
    plan: WITH_AN_ARTEFACT,
    startAt: 612,
    pictureHref: carryingTheSource,
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: AT_1274, query: { at: '612' } },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const router = getRouter()

    await userEvent.click(canvas.getByRole('button', { name: '10 秒進む' }))
    await waitFor(() =>
      expect(canvas.getByText(/^10:22 \//)).toBeInTheDocument(),
    )

    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const sources = await screen.findByRole('group', { name: 'ソース' })

    await userEvent.click(
      within(sources).getByRole('button', { name: '元のまま' }),
    )

    await expect(router.replace).toHaveBeenCalledWith(
      `${AT_1274}?at=622&source=recording`,
      { scroll: false },
    )
  },
}

export const まだ観ていないうちにソースを切り替えてもアドレスの秒は変えない: Story =
  {
    args: {
      detail: detail('1274'),
      plan: WITH_AN_ARTEFACT,
      startAt: 612,
      playsAtOnce: false,
      pictureHref: carryingTheSource,
    },
    parameters: {
      nextjs: { appDirectory: true, navigation: { pathname: AT_1274 } },
    },
    play: async ({ canvasElement }) => {
      const canvas = within(canvasElement)
      const router = getRouter()

      await userEvent.click(canvas.getByRole('button', { name: '設定' }))

      const sources = await screen.findByRole('group', { name: 'ソース' })

      await userEvent.click(
        within(sources).getByRole('button', { name: '元のまま' }),
      )

      await expect(router.replace).toHaveBeenCalledWith(
        `${AT_1274}?source=recording`,
        { scroll: false },
      )
      await expect(canvas.getByText(/^10:12 \//)).toBeInTheDocument()
    },
  }

const jobsHeard: (() => void)[] = []

function hearingTheJobs(noticed: () => void) {
  jobsHeard.push(noticed)

  return () => {
    const at = jobsHeard.indexOf(noticed)

    if (at >= 0) {
      jobsHeard.splice(at, 1)
    }
  }
}

const standing: { now?: string } = {}

async function askingWhichArtefact() {
  return standing.now
}

async function theJobsSay(artefact: string) {
  standing.now = artefact

  await waitFor(() => expect(jobsHeard.length).toBeGreaterThan(0))
  jobsHeard.at(-1)?.()
  await new Promise((settle) => setTimeout(settle, 50))
}

export const 観ている最中に成果物が置き換わるとその秒から開き直す: Story = {
  args: {
    detail: detail('1274'),
    plan: WITH_AN_ARTEFACT,
    startAt: 612,
    pictureHref: carryingTheSource,
    artefact: 'job-a',
    onAskWhichArtefact: askingWhichArtefact,
    listenForEncodeJobs: hearingTheJobs,
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: AT_1274, query: { at: '612' } },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const router = getRouter()

    await userEvent.click(canvas.getByRole('button', { name: '10 秒進む' }))
    await waitFor(() =>
      expect(canvas.getByText(/^10:22 \//)).toBeInTheDocument(),
    )

    const before = router.replace.mock.calls.length

    await theJobsSay('job-a')
    await expect(router.replace.mock.calls.length).toBe(before)

    await theJobsSay('job-b')
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(`${AT_1274}?at=622`, {
        scroll: false,
      }),
    )
  },
}

async function pausedAt622(canvasElement: HTMLElement) {
  const canvas = within(canvasElement)
  const video = canvasElement.querySelector('video')

  await userEvent.click(canvas.getByRole('button', { name: '10 秒進む' }))
  await waitFor(() => expect(canvas.getByText(/^10:22 \//)).toBeInTheDocument())
  video?.dispatchEvent(new Event('playing'))
  video?.dispatchEvent(new Event('pause'))
  await waitFor(() =>
    expect(canvas.getByRole('button', { name: '再生' })).toBeVisible(),
  )
}

export const 一時停止中に成果物が置き換わると一時停止のまま開き直す: Story = {
  args: {
    detail: detail('1274'),
    plan: WITH_AN_ARTEFACT,
    startAt: 612,
    pictureHref: carryingTheSource,
    artefact: 'job-a',
    onAskWhichArtefact: askingWhichArtefact,
    listenForEncodeJobs: hearingTheJobs,
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: AT_1274, query: { at: '612' } },
    },
  },
  play: async ({ canvasElement }) => {
    await pausedAt622(canvasElement)
    await theJobsSay('job-b')
    await waitFor(() =>
      expect(getRouter().replace).toHaveBeenCalledWith(
        `${AT_1274}?at=622&paused=1`,
        { scroll: false },
      ),
    )
  },
}

const pageRead: { artefact?: string; heard: Set<() => void> } = {
  heard: new Set(),
}

function thePageReads(artefact: string | undefined) {
  pageRead.artefact = artefact
  pageRead.heard.forEach((hear) => hear())
}

function hearingThePage(hear: () => void) {
  pageRead.heard.add(hear)

  return () => {
    pageRead.heard.delete(hear)
  }
}

function SeatedOnThePage(args: ComponentProps<typeof Player>) {
  const artefact = useSyncExternalStore(hearingThePage, () => pageRead.artefact)

  return <PlayerSeat {...args} artefact={artefact} />
}

export const 止めた秒がアドレスと同じでも置き換わると開き直す: Story = {
  args: {
    detail: detail('1274'),
    plan: WITH_AN_ARTEFACT,
    startAt: 0,
    holdsAtOnce: true,
    pictureHref: () => DRAWN_PICTURE,
    onAskWhichArtefact: askingWhichArtefact,
    listenForEncodeJobs: hearingTheJobs,
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: AT_1274, query: { at: '0', paused: '1' } },
    },
  },
  beforeEach: () => {
    pageRead.artefact = 'job-a'
  },
  render: (args) => <SeatedOnThePage {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const router = getRouter()

    router.refresh.mockImplementation(() => thePageReads(standing.now))

    await waitFor(() =>
      expect(canvas.getAllByRole('button', { name: '再生' })).toHaveLength(2),
    )

    const opened = canvasElement.querySelector('video')

    await theJobsSay('job-b')
    await waitFor(() =>
      expect(canvasElement.querySelector('video')).not.toBe(opened),
    )
    await expect(router.replace).not.toHaveBeenCalled()
    await expect(router.refresh).toHaveBeenCalledTimes(1)

    const reopened = canvasElement.querySelector('video')

    await expect(reopened).not.toHaveAttribute('autoplay')
    await waitFor(() =>
      expect(canvas.getAllByRole('button', { name: '再生' })).toHaveLength(2),
    )
    await expect(reopened?.paused).toBe(true)
  },
}

export const 一時停止のまま開いて読み込み中に置き換わっても一時停止のまま開き直す: Story =
  {
    args: {
      detail: detail('1274'),
      plan: WITH_AN_ARTEFACT,
      startAt: 612,
      holdsAtOnce: true,
      pictureHref: carryingTheSource,
      onAskWhichArtefact: askingWhichArtefact,
      listenForEncodeJobs: hearingTheJobs,
    },
    parameters: {
      nextjs: {
        appDirectory: true,
        navigation: { pathname: AT_1274, query: { at: '612', paused: '1' } },
      },
    },
    beforeEach: () => {
      pageRead.artefact = 'job-a'
    },
    render: (args) => <SeatedOnThePage {...args} />,
    play: async ({ canvasElement }) => {
      const router = getRouter()

      router.refresh.mockImplementation(() => thePageReads(standing.now))

      const opened = canvasElement.querySelector('video')

      await expect(opened).toHaveAttribute('preload', 'auto')

      await theJobsSay('job-b')
      await waitFor(() =>
        expect(canvasElement.querySelector('video')).not.toBe(opened),
      )
      await expect(router.replace).not.toHaveBeenCalled()
      await expect(router.refresh).toHaveBeenCalledTimes(1)
      await expect(canvasElement.querySelector('video')).not.toHaveAttribute(
        'autoplay',
      )
    },
  }

export const 一時停止のまま開いて再生を押したあとに止まって置き換わると再生として開き直す: Story =
  {
    args: {
      detail: detail('1274'),
      plan: WITH_AN_ARTEFACT,
      startAt: 612,
      holdsAtOnce: true,
      pictureHref: carryingTheSource,
      askWhy: async () => ({ kind: 'transcode' }),
      artefact: 'job-a',
      onAskWhichArtefact: askingWhichArtefact,
      listenForEncodeJobs: hearingTheJobs,
    },
    parameters: {
      nextjs: {
        appDirectory: true,
        navigation: { pathname: AT_1274, query: { at: '612', paused: '1' } },
      },
    },
    play: async ({ canvasElement }) => {
      const canvas = within(canvasElement)

      await userEvent.click(canvas.getAllByRole('button', { name: '再生' })[0])
      canvasElement.querySelector('video')?.dispatchEvent(new Event('error'))
      await waitFor(() =>
        expect(canvasElement.querySelector('video')).not.toBeInTheDocument(),
      )

      await theJobsSay('job-b')
      await waitFor(() =>
        expect(getRouter().replace).toHaveBeenCalledWith(`${AT_1274}?at=612`, {
          scroll: false,
        }),
      )
    },
  }

export const 一時停止のまま開いて読み込み中にソースを切り替えても一時停止のまま開き直す: Story =
  {
    args: {
      detail: detail('1274'),
      plan: WITH_AN_ARTEFACT,
      startAt: 612,
      holdsAtOnce: true,
      pictureHref: carryingTheSource,
    },
    parameters: {
      nextjs: {
        appDirectory: true,
        navigation: { pathname: AT_1274, query: { at: '612', paused: '1' } },
      },
    },
    play: async ({ canvasElement }) => {
      await userEvent.click(
        within(canvasElement).getByRole('button', { name: '設定' }),
      )

      const sources = await screen.findByRole('group', { name: 'ソース' })

      await userEvent.click(
        within(sources).getByRole('button', { name: '元のまま' }),
      )

      await expect(getRouter().replace).toHaveBeenCalledWith(
        `${AT_1274}?at=612&paused=1&source=recording`,
        { scroll: false },
      )
    },
  }

export const 一時停止中にソースを切り替えると一時停止のまま開き直す: Story = {
  args: {
    detail: detail('1274'),
    plan: WITH_AN_ARTEFACT,
    startAt: 612,
    pictureHref: carryingTheSource,
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: AT_1274, query: { at: '612' } },
    },
  },
  play: async ({ canvasElement }) => {
    await pausedAt622(canvasElement)
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: '設定' }),
    )

    const sources = await screen.findByRole('group', { name: 'ソース' })

    await userEvent.click(
      within(sources).getByRole('button', { name: '元のまま' }),
    )

    await expect(getRouter().replace).toHaveBeenCalledWith(
      `${AT_1274}?at=622&paused=1&source=recording`,
      { scroll: false },
    )
  },
}

export const 一時停止のまま開くと映像を読んでも再生を始めない: Story = {
  args: {
    detail: detail('1274'),
    plan: WITH_AN_ARTEFACT,
    startAt: 0,
    holdsAtOnce: true,
    pictureHref: () => DRAWN_PICTURE,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const video = canvasElement.querySelector('video')

    await expect(video).not.toHaveAttribute('autoplay')
    await expect(video).toHaveAttribute('preload', 'auto')
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: '再生' })).toBeVisible(),
    )
    await expect(video?.paused).toBe(true)
  },
}

let plansAsked = 0

async function failingOnceThenPlanning(
  _id: string,
  sound: SoundTrack,
  source?: PlaybackSource,
): Promise<PlaybackRead> {
  plansAsked += 1
  reaskedWith.push(`${sound}/${source ?? '—'}`)

  if (plansAsked === 1) {
    throw new Error('the plan could not be read')
  }

  return { state: 'planned', plan: WITH_AN_ARTEFACT }
}

export const 置き換えの再計画に失敗したら次の知らせで読み直す: Story = {
  args: {
    detail: detail('1274'),
    plan: WITH_AN_ARTEFACT,
    startAt: 612,
    playsAtOnce: false,
    pictureHref: carryingTheSource,
    onAskForTheSound: failingOnceThenPlanning,
    artefact: 'job-a',
    onAskWhichArtefact: askingWhichArtefact,
    listenForEncodeJobs: hearingTheJobs,
  },
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: AT_1274 } },
  },
  play: async () => {
    plansAsked = 0
    reaskedWith.length = 0

    await theJobsSay('job-b')
    await waitFor(() => expect(reaskedWith).toHaveLength(1))

    await theJobsSay('job-b')
    await waitFor(() => expect(reaskedWith).toHaveLength(2))

    await theJobsSay('job-b')
    await expect(reaskedWith).toHaveLength(2)
  },
}

export const まだ観ていないうちに成果物が置き換わると次の再生で新しい成果物を開く: Story =
  {
    args: {
      detail: detail('1274'),
      plan: WITH_AN_ARTEFACT,
      startAt: 612,
      playsAtOnce: false,
      pictureHref: carryingTheSource,
      onAskForTheSound: planningWithTheSource(WITH_AN_ARTEFACT),
      artefact: 'job-a',
      onAskWhichArtefact: askingWhichArtefact,
      listenForEncodeJobs: hearingTheJobs,
    },
    parameters: {
      nextjs: { appDirectory: true, navigation: { pathname: AT_1274 } },
    },
    play: async ({ canvasElement }) => {
      const canvas = within(canvasElement)
      const router = getRouter()
      const before = router.replace.mock.calls.length

      reaskedWith.length = 0
      await theJobsSay('job-b')

      await waitFor(() => expect(reaskedWith).toEqual(['main/artefact']))
      await expect(router.replace.mock.calls.length).toBe(before)
      await expect(canvas.getByText(/^10:12 \//)).toBeInTheDocument()
    },
  }

export const 元のままを見ているあいだは成果物の置き換えを聞かない: Story = {
  args: {
    detail: detail('1274'),
    plan: THE_RECORDING_ITSELF,
    startAt: 612,
    pictureHref: carryingTheSource,
    artefact: 'job-a',
    onAskWhichArtefact: askingWhichArtefact,
    listenForEncodeJobs: hearingTheJobs,
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: AT_1274, query: { at: '612' } },
    },
  },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(within(canvasElement).getByText(/^10:12 \//)).toBeInTheDocument(),
    )
    await expect(jobsHeard).toHaveLength(0)
  },
}

export const 成果物がない録画にソースの行は無い: Story = {
  args: {
    detail: detail('1266'),
    plan: NOTHING_WAS_ENCODED,
    startAt: 0,
    unaskedProfile: '1080p60',
    pictureHref: carryingTheSource,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() =>
      expect(asked.at(-1)).toBe(
        '/api/videos/1266/play?from=0&profile=1080p60&source=recording',
      ),
    )
    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const quality = await screen.findByRole('group', { name: '画質' })

    await expect(
      within(quality).getByRole('button', { name: '1080p60' }),
    ).toBeVisible()
    await expect(screen.queryByRole('group', { name: 'ソース' })).toBeNull()
    await expect(screen.queryByText('元のまま')).toBeNull()
  },
}

export const 元のままを見ている録画は音声を替えても元のままのまま: Story = {
  args: {
    detail: detail('1274'),
    plan: THE_RECORDING_ITSELF_IN_TWO_LANGUAGES,
    startAt: 0,
    unaskedProfile: '1080p60',
    pictureHref: carryingTheSource,
    onAskForTheSound: planningWithTheSource(
      THE_RECORDING_ITSELF_IN_TWO_LANGUAGES,
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const sounds = await screen.findByRole('group', { name: '音声' })

    asked.length = 0
    reaskedWith.length = 0
    await userEvent.click(
      within(sounds).getByRole('button', { name: '副音声' }),
    )

    await waitFor(() => expect(reaskedWith).toEqual(['secondary/recording']))
    await waitFor(() =>
      expect(asked).toEqual([
        '/api/videos/1274/play?from=0&profile=1080p60&sound=secondary&source=recording',
      ]),
    )
  },
}

const METADATA_IS_ALREADY_IN = 1

function aPictureAlreadyRead(): () => void {
  const own = {
    readyState: Object.getOwnPropertyDescriptor(
      HTMLMediaElement.prototype,
      'readyState',
    ),
    currentTime: Object.getOwnPropertyDescriptor(
      HTMLMediaElement.prototype,
      'currentTime',
    ),
  }
  const stood = { at: 0 }

  Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
    configurable: true,
    get: () => METADATA_IS_ALREADY_IN,
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
    configurable: true,
    get: () => stood.at,
    set: (second: number) => {
      stood.at = second
    },
  })

  return () => {
    if (own.readyState) {
      Object.defineProperty(
        HTMLMediaElement.prototype,
        'readyState',
        own.readyState,
      )
    }

    if (own.currentTime) {
      Object.defineProperty(
        HTMLMediaElement.prototype,
        'currentTime',
        own.currentTime,
      )
    }
  }
}

export const 途中から開いた録画は読み込みを見逃しても頭出しする: Story = {
  args: {
    detail: detail('1266'),
    plan: HANDED_OVER,
    startAt: 600,
    pictureHref: carrying,
  },
  play: async ({ canvasElement, mount }) => {
    const asItWas = aPictureAlreadyRead()

    try {
      await mount()

      const canvas = within(canvasElement)
      const picture = canvasElement.querySelector('video') as HTMLVideoElement

      await waitFor(() => expect(asked.at(-1)).toBe('0/—/—'))
      await waitFor(() => expect(picture.currentTime).toBe(600))
      await expect(canvas.getByText('10:00 / 4:12:38')).toBeVisible()

      picture.currentTime = 601
      picture.dispatchEvent(new Event('timeupdate'))

      await waitFor(() =>
        expect(canvas.getByText('10:01 / 4:12:38')).toBeVisible(),
      )
    } finally {
      asItWas()
    }
  },
}

export const 途中から観ている録画は音声を替えても位置を保つ: Story = {
  args: {
    detail: detail('1266'),
    plan: IN_TWO_LANGUAGES,
    startAt: 1200,
    unaskedProfile: '1080p60',
    pictureHref: carrying,
    onAskForTheSound: planning(HANDED_OVER_IN_TWO_LANGUAGES),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => expect(asked.at(-1)).toBe('1200/1080p60/main'))
    await expect(canvas.getByText('20:00 / 4:12:38')).toBeVisible()

    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const sounds = await screen.findByRole('group', { name: '音声' })

    asked.length = 0
    await userEvent.click(
      within(sounds).getByRole('button', { name: '副音声' }),
    )

    await waitFor(() => expect(asked).toEqual(['0/—/secondary']))
    await expect(canvas.getByText('20:00 / 4:12:38')).toBeVisible()

    asked.length = 0
    await userEvent.click(
      within(sounds).getByRole('button', { name: '主音声' }),
    )

    await waitFor(() => expect(asked).toEqual(['0/—/main']))
    await expect(canvas.getByText('20:00 / 4:12:38')).toBeVisible()
  },
}

export const 音声は諦めても経路が変わったら開き直す: Story = {
  args: {
    detail: detail('1266'),
    plan: IN_TWO_LANGUAGES,
    startAt: 1200,
    unaskedProfile: '1080p60',
    pictureHref: carrying,
    onAskForTheSound: planning(HANDED_OVER),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => expect(asked.at(-1)).toBe('1200/1080p60/main'))
    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const sounds = await screen.findByRole('group', { name: '音声' })

    asked.length = 0
    reasked.length = 0
    await userEvent.click(
      within(sounds).getByRole('button', { name: '副音声' }),
    )

    await waitFor(() => expect(reasked).toEqual(['secondary']))
    await waitFor(() => expect(asked).toEqual(['0/—/—']))
    await expect(canvas.getByText(THE_SOUNDS_COULD_NOT_BE_READ)).toBeVisible()
    await expect(canvas.getByText('20:00 / 4:12:38')).toBeVisible()
    await waitFor(() =>
      expect(screen.queryByRole('group', { name: '音声' })).toBeNull(),
    )
  },
}

export const 音声を訊き直せなかったら断りを出す: Story = {
  args: {
    detail: detail('1266'),
    plan: IN_TWO_LANGUAGES,
    startAt: 0,
    unaskedProfile: '1080p60',
    pictureHref: carrying,
    onAskForTheSound: throwingOnTheSound,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const sounds = await screen.findByRole('group', { name: '音声' })

    asked.length = 0
    reasked.length = 0
    await userEvent.click(
      within(sounds).getByRole('button', { name: '副音声' }),
    )

    await waitFor(() => expect(reasked).toEqual(['secondary']))
    await waitFor(() =>
      expect(canvas.getByText(THE_SOUNDS_COULD_NOT_BE_READ)).toBeVisible(),
    )
    await expect(asked).toEqual([])
    await waitFor(() =>
      expect(
        within(sounds).getByRole('button', { name: '主音声' }),
      ).toHaveAttribute('aria-pressed', 'true'),
    )
  },
}

export const 答えが届く前に戻したら主音声のままになる: Story = {
  args: {
    detail: detail('1266'),
    plan: IN_TWO_LANGUAGES,
    startAt: 0,
    unaskedProfile: '1080p60',
    pictureHref: carrying,
    onAskForTheSound: heldOpen,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const sounds = await screen.findByRole('group', { name: '音声' })
    const main = within(sounds).getByRole('button', { name: '主音声' })
    const secondary = within(sounds).getByRole('button', { name: '副音声' })

    asked.length = 0
    reasked.length = 0

    await userEvent.click(secondary)

    await waitFor(() => expect(reasked).toEqual(['secondary']))
    await waitFor(() =>
      expect(secondary).toHaveAttribute('aria-pressed', 'true'),
    )

    await userEvent.click(main)

    await waitFor(() => expect(main).toHaveAttribute('aria-pressed', 'true'))
    await expect(reasked).toEqual(['secondary'])

    theAnswer.lands?.({ state: 'planned', plan: IN_TWO_LANGUAGES })

    await new Promise((rest) => setTimeout(rest, 300))

    await expect(asked).toEqual([])
    await expect(main).toHaveAttribute('aria-pressed', 'true')
    await expect(secondary).toHaveAttribute('aria-pressed', 'false')
  },
}

export const 再生できない_持っていない音声を頼んだ: Story = {
  args: {
    detail: detail('1266'),
    plan: IN_TWO_LANGUAGES,
    startAt: 0,
    pictureHref: noPicture,
    askWhy: answering({
      kind: 'refused',
      said: 'この録画のもとになった放送は選んだ音声を運んでいないため、再生できませんでした。',
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() =>
      expect(canvas.getByText('再生を開始できませんでした')).toBeVisible(),
    )
    await expect(canvas.getByText(/選んだ音声を運んでいないため/)).toBeVisible()
    await expect(canvas.queryByRole('button', { name: '再試行' })).toBeNull()
  },
}

export const 音量: Story = {
  args: { detail: detail('1266') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const level = canvas.getByRole('slider', { name: '音量' })

    await expect(level).toHaveValue('100')
    await expect(canvas.getByRole('button', { name: '消音' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  },
}

const A_WIDE_WINDOW = { width: 1680, height: 1200 }

const A_SHORT_WINDOW = { width: 1680, height: 700 }

function faceOf(canvasElement: HTMLElement) {
  const bar = canvasElement.querySelector(
    '[data-slot="player-chrome"]',
  ) as HTMLElement

  return {
    face: (
      canvasElement.querySelector('[data-slot="player-face"]') as HTMLElement
    ).getBoundingClientRect(),
    picture: (
      canvasElement.querySelector('video') as HTMLVideoElement
    ).getBoundingClientRect(),
    bar: bar.getBoundingClientRect(),
  }
}

export const 面いっぱいの映像: Story = {
  parameters: { screen: A_WIDE_WINDOW },
  play: async ({ canvasElement }) => {
    const { face, picture, bar } = faceOf(canvasElement)

    await expect(face.width).toBeGreaterThan(1280)
    await expect(Math.abs(picture.width - face.width)).toBeLessThan(3)
    await expect(Math.abs(picture.height - face.height)).toBeLessThan(3)

    await expect(Math.abs(bar.width - face.width)).toBeLessThan(1)
  },
}

export const 背の低い窓では映像が縮む: Story = {
  parameters: { screen: A_SHORT_WINDOW },
  play: async ({ canvasElement }) => {
    const { face, picture } = faceOf(canvasElement)

    await expect(face.width).toBeLessThan(1000)
    await expect(Math.abs(picture.width - face.width)).toBeLessThan(3)
    await expect(Math.abs(face.width / face.height - 16 / 9)).toBeLessThan(0.02)
  },
}

function board(canvasElement: HTMLElement): HTMLElement {
  const found = canvasElement.querySelector('[data-slot="player"]')

  if (!(found instanceof HTMLElement)) {
    throw new Error('the player is not on the screen')
  }

  return found
}

function aim(on: HTMLElement) {
  on.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
}

function press(on: HTMLElement, key: string) {
  on.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

export const キーで音量と消音: Story = {
  args: { detail: detail('1266') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const level = canvas.getByRole('slider', { name: '音量' })
    const quiet = canvas.getByRole('button', { name: '消音' })
    const player = board(canvasElement)

    aim(player)
    press(player, 'ArrowDown')
    press(player, 'ArrowDown')
    await waitFor(() => expect(level).toHaveValue('90'))

    press(player, 'ArrowUp')
    await waitFor(() => expect(level).toHaveValue('95'))

    press(player, 'm')
    await waitFor(() => expect(quiet).toHaveAttribute('aria-pressed', 'true'))
    await expect(level).toHaveValue('0')

    press(player, 'm')
    await waitFor(() => expect(quiet).toHaveAttribute('aria-pressed', 'false'))
    await expect(level).toHaveValue('95')
  },
}

export const 送りを続けても要求は一度: Story = {
  args: { detail: detail('1266'), startAt: 0, pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const player = board(canvasElement)

    asked.length = 0

    for (let i = 0; i < 5; i += 1) {
      aim(player)
      press(player, 'ArrowRight')
    }

    await waitFor(() =>
      expect(canvas.getByText('0:50 / 4:12:38')).toBeVisible(),
    )
    await expect(asked).toEqual([])
    await expect(
      canvas.getByRole('slider', { name: '再生位置' }),
    ).toHaveAttribute('aria-valuenow', '50')

    await waitFor(() => expect(asked).toEqual(['50/1080p60']), {
      timeout: 3000,
    })

    await new Promise((rest) => setTimeout(rest, 800))
    await expect(asked).toEqual(['50/1080p60'])
  },
}

export const 送りのボタンも要求は一度: Story = {
  args: { detail: detail('1266'), startAt: 0, pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    asked.length = 0

    const forward = canvas.getByRole('button', { name: '10 秒進む' })

    for (let i = 0; i < 5; i += 1) {
      await userEvent.click(forward)
    }

    await waitFor(() =>
      expect(canvas.getByText('0:50 / 4:12:38')).toBeVisible(),
    )

    await waitFor(() => expect(asked).toEqual(['50/1080p60']), {
      timeout: 3000,
    })

    await new Promise((rest) => setTimeout(rest, 800))
    await expect(asked).toEqual(['50/1080p60'])

    await userEvent.click(canvas.getByRole('button', { name: '10 秒戻る' }))
    await waitFor(() =>
      expect(canvas.getByText('0:40 / 4:12:38')).toBeVisible(),
    )
  },
}

export const 戻しは頭で止まる: Story = {
  args: { detail: detail('1266'), startAt: 0, pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const player = board(canvasElement)

    asked.length = 0

    for (let i = 0; i < 3; i += 1) {
      aim(player)
      press(player, 'ArrowLeft')
    }

    await waitFor(() =>
      expect(canvas.getByText('0:00 / 4:12:38')).toBeVisible(),
    )
    await waitFor(() => expect(asked).toEqual(['0/1080p60']), { timeout: 3000 })
  },
}

export const 映像を押して再生: Story = {
  args: { detail: detail('1266'), pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const area = canvasElement.querySelector('[data-slot="player-press"]')

    asked.length = 0
    await tapAt(area as HTMLElement, 1 / 2, 1)
    await waitFor(() => expect(asked).toEqual(['0/1080p60']))

    asked.length = 0
    await tapAt(area as HTMLElement, 1 / 2, 2)
    await waitFor(() => expect(document.fullscreenElement).not.toBeNull())
    await expect(asked).toEqual([])

    await document.exitFullscreen()
    await waitFor(() => expect(document.fullscreenElement).toBeNull())
  },
}

export const バーの操作子は再生を動かさない: Story = {
  args: { detail: detail('1266'), pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const quiet = canvas.getByRole('button', { name: '消音' })

    asked.length = 0
    await userEvent.click(quiet)

    await expect(quiet).toHaveAttribute('aria-pressed', 'true')
    await expect(asked).toEqual([])

    quiet.focus()
    press(quiet, ' ')
    await expect(asked).toEqual([])

    const seek = canvas.getByRole('slider', { name: '再生位置' })

    seek.focus()
    press(seek, 'ArrowRight')
    await waitFor(() =>
      expect(canvas.getByText('0:10 / 4:12:38')).toBeVisible(),
    )
  },
}

export const Range直配信は待たずに動く: Story = {
  args: {
    detail: detail('1274'),
    plan: {
      ...ON_THE_FLY,
      route: 'direct',
      seeking: 'byRange',
      canSeek: true,
      transcodes: false,
      bytes: 3_490_550_128,
    },
    startAt: 0,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const player = board(canvasElement)

    asked.length = 0

    for (let i = 0; i < 4; i += 1) {
      aim(player)
      press(player, 'ArrowRight')
    }

    await waitFor(() =>
      expect(canvas.getByRole('slider', { name: '再生位置' })).toHaveAttribute(
        'aria-valuenow',
        '40',
      ),
    )

    await new Promise((rest) => setTimeout(rest, 800))
    await expect(asked).toEqual([])
  },
}

export const 操作列が出ている: Story = {
  play: async ({ canvasElement }) => {
    const chrome = canvasElement.querySelector('[data-slot="player-chrome"]')

    await expect(chrome).toHaveAttribute('data-up', 'true')
    await expect(getComputedStyle(chrome as Element).backgroundImage).toContain(
      'linear-gradient',
    )
    await expect(getComputedStyle(chrome as Element).backgroundColor).toMatch(
      /rgba\(0, 0, 0, 0\)|transparent/,
    )
  },
}

export const 停止中は中央に印: Story = {
  play: async ({ canvasElement }) => {
    const standing = () =>
      canvasElement.querySelector('[data-slot="player-center-standing"]')

    await expect(standing()).not.toBeNull()

    await expect(standing()).toHaveProperty('tagName', 'BUTTON')
    await expect(standing()).toHaveAccessibleName('再生')
    await expect(
      getComputedStyle(standing() as Element).pointerEvents,
    ).not.toBe('none')

    const box = (standing() as Element).getBoundingClientRect()

    await expect(box.width).toBeGreaterThanOrEqual(44)
    await expect(box.height).toBeGreaterThanOrEqual(44)

    const bezel = () =>
      canvasElement.querySelector('[data-slot="player-center-bezel"] span')

    await expect(bezel()).toBeNull()

    await userEvent.click(
      canvasElement.querySelector('[data-slot="player-press"]') as HTMLElement,
    )
    await waitFor(() => expect(bezel()).not.toBeNull())
    await expect(getComputedStyle(bezel() as Element).animationName).toBe(
      'player-burst',
    )
  },
}

export const 真ん中の的を押して始める: Story = {
  args: { detail: detail('1266') },
  play: async ({ canvasElement }) => {
    const target = canvasElement.querySelector(
      '[data-slot="player-center-standing"]',
    ) as HTMLElement

    await userEvent.click(target)

    await waitFor(() =>
      expect(canvasElement.querySelector('video')).toHaveAttribute('src'),
    )

    await expect(board(canvasElement).contains(document.activeElement)).toBe(
      true,
    )
  },
}

export const 開いた時点で鍵が効く: Story = {
  args: { detail: detail('1266') },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(board(canvasElement).contains(document.activeElement)).toBe(true),
    )
  },
}

export const 矢印は狙ってから: Story = {
  args: { detail: detail('1266') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const level = canvas.getByRole('slider', { name: '音量' })
    const player = board(canvasElement)

    press(player, 'ArrowDown')
    await expect(level).toHaveValue('100')

    await userEvent.click(
      canvasElement.querySelector('[data-slot="player-press"]') as HTMLElement,
    )
    press(player, 'ArrowDown')
    await waitFor(() => expect(level).toHaveValue('95'))
  },
}

export const 音量の押しにも印: Story = {
  args: { detail: detail('1266') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const player = board(canvasElement)
    const said = () =>
      canvasElement.querySelector('[data-slot="player-center-bezel-text"]')

    await expect(said()).toBeNull()

    aim(player)
    press(player, 'ArrowDown')
    await waitFor(() => expect(said()).toHaveTextContent('95%'))

    press(player, 'm')
    await waitFor(() => expect(said()).toHaveTextContent('0%'))
    await expect(canvas.getByRole('button', { name: '消音' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    press(player, 'm')
    await waitFor(() => expect(said()).toHaveTextContent('95%'))
  },
}

export const 送り戻しの印は脇に立つ: Story = {
  args: { detail: detail('1266'), startAt: 0, pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const player = board(canvasElement)
    const mark = () =>
      canvasElement.querySelector('[data-slot="player-seek-flash"]')

    await expect(mark()).toBeNull()

    aim(player)
    press(player, 'ArrowRight')
    await waitFor(() => expect(mark()).not.toBeNull())
    await expect(mark()).toHaveAttribute('data-way', 'forward')
    await expect(mark()).toHaveTextContent('10 秒')
    await expect(getComputedStyle(mark() as Element).animationDuration).toBe(
      '0.7s',
    )

    await expect(
      canvasElement.querySelector('[data-slot="player-center-bezel"] span'),
    ).toBeNull()

    press(player, 'ArrowRight')
    press(player, 'ArrowRight')
    await waitFor(() => expect(mark()).toHaveTextContent('30 秒'))

    press(player, 'ArrowLeft')
    await waitFor(() => expect(mark()).toHaveAttribute('data-way', 'back'))
    await expect(mark()).toHaveTextContent('10 秒')
  },
}

export const シーク中: Story = {
  args: { detail: detail('1266'), pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const seek = canvas.getByRole('slider', { name: '再生位置' })
    const chrome = canvasElement.querySelector('[data-slot="player-chrome"]')
    const box = seek.getBoundingClientRect()
    const at = (share: number) => ({
      clientX: box.left + box.width * share,
      clientY: box.top + box.height / 2,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      bubbles: true,
    })

    seek.setPointerCapture = () => undefined
    seek.releasePointerCapture = () => undefined

    asked.length = 0
    seek.dispatchEvent(new PointerEvent('pointerdown', at(0.2)))
    seek.dispatchEvent(new PointerEvent('pointermove', at(0.5)))

    await waitFor(() => expect(seek).toHaveAttribute('data-wanted', 'true'))
    await expect(chrome).toHaveAttribute('data-up', 'true')
    await waitFor(() =>
      expect(getComputedStyle(seek.firstElementChild as Element).height).toBe(
        '5px',
      ),
    )
    await waitFor(() =>
      expect(
        getComputedStyle(
          canvasElement.querySelector(
            '[data-slot="player-seek-knob"]',
          ) as Element,
        ).scale,
      ).toBe('1'),
    )
    await waitFor(() => expect(canvas.getByText(/^2:06:19 \//)).toBeVisible())
    await expect(asked).toEqual([])

    seek.dispatchEvent(new PointerEvent('pointerup', at(0.5)))
    await waitFor(() => expect(asked.length).toBe(1))
  },
}

export const 設定を開いているあいだ操作列は消えない: Story = {
  args: { detail: detail('1266'), pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const chrome = canvasElement.querySelector('[data-slot="player-chrome"]')

    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const surface = await screen.findByRole('dialog', { name: '設定' })

    await expect(surface.closest('[data-slot="player-chrome"]')).toBeNull()

    canvasElement.querySelector('video')?.dispatchEvent(new Event('playing'))
    await new Promise((rest) => setTimeout(rest, 3400))

    await expect(chrome).toHaveAttribute('data-up', 'true')
    await expect(surface).toBeVisible()
  },
}

export const 設定を閉じる押下は再生を動かさない: Story = {
  args: { detail: detail('1266'), pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const area = canvasElement.querySelector(
      '[data-slot="player-press"]',
    ) as HTMLElement

    canvasElement.querySelector('video')?.dispatchEvent(new Event('playing'))
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: '一時停止' })).toBeVisible(),
    )

    await userEvent.click(canvas.getByRole('button', { name: '設定' }))
    await screen.findByRole('dialog', { name: '設定' })

    await userEvent.click(area)
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: '設定' })).toBeNull(),
    )
    await expect(canvas.getByRole('button', { name: '一時停止' })).toBeVisible()

    await new Promise((rest) => setTimeout(rest, 700))
    await userEvent.click(area)
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: '再生' })).toBeVisible(),
    )
  },
}

export const 立て直しのあいだ映っていたコマが残る: Story = {
  args: {
    detail: { ...detail('1266'), thumbnailHref: SUBTITLED_FRAME },
    startAt: 0,
    pictureHref: (_id: string, from: number) =>
      from === 0 ? DRAWN_PICTURE : stalling(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const held = canvasElement.querySelector(
      '[data-slot="player-held-frame"]',
    ) as HTMLCanvasElement

    await expect(held).not.toHaveAttribute('data-holding')

    const picture = canvasElement.querySelector('video') as HTMLVideoElement
    await waitFor(() => expect(picture.readyState).toBeGreaterThan(1), {
      timeout: 10000,
    })

    await userEvent.click(canvas.getByRole('button', { name: '10 秒進む' }))

    await waitFor(() => expect(held).toHaveAttribute('data-holding', 'true'), {
      timeout: 5000,
    })
    await waitFor(() => expect(picture.readyState).toBe(0))
    await expect(held.width).toBe(640)
    await expect(held.height).toBe(360)

    const drawn = held
      .getContext('2d')
      ?.getImageData(0, 0, held.width, held.height).data as Uint8ClampedArray
    let lit = 0
    for (let at = 0; at < drawn.length; at += 4) {
      if (drawn[at] > 40 || drawn[at + 1] > 40 || drawn[at + 2] > 40) {
        lit += 1
      }
    }
    await expect(lit).toBeGreaterThan(drawn.length / 4 / 10)

    await expect(canvas.getByRole('status')).toBeVisible()
    await expect(
      canvasElement.querySelector('[data-slot="player-center-standing"]'),
    ).toBeNull()
  },
}

export const 立て直しに失敗したらコマごと断りに変わる: Story = {
  args: {
    detail: { ...detail('1266'), thumbnailHref: SUBTITLED_FRAME },
    startAt: 0,
    pictureHref: (_id: string, from: number) =>
      from === 0 ? DRAWN_PICTURE : noPicture(),
    askWhy: answering({ kind: 'transcode' }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const picture = canvasElement.querySelector('video') as HTMLVideoElement

    await waitFor(() => expect(picture.readyState).toBeGreaterThan(1), {
      timeout: 10000,
    })

    await userEvent.click(canvas.getByRole('button', { name: '10 秒進む' }))

    await waitFor(
      () =>
        expect(
          canvas.getByText('元 TS からのトランスコードに失敗しました。'),
        ).toBeVisible(),
      { timeout: 10000 },
    )
    await expect(
      canvasElement.querySelector('[data-slot="player-held-frame"]'),
    ).toBeNull()
  },
}

const showing = (canvasElement: HTMLElement) => {
  const picture = canvasElement.querySelector('video') as HTMLVideoElement

  return waitFor(() => expect(picture.readyState).toBeGreaterThan(1), {
    timeout: 10000,
  })
}

const taken: { name: string; blob: Blob | null }[] = []

const capturing: TakeCapture = async ({ video, name, over }) => {
  const blob = await drawCapture({ video, over })

  taken.push({ name, blob })

  return blob ? 'saved' : 'refused'
}

async function sizeOf(blob: Blob) {
  const bitmap = await createImageBitmap(blob)

  return { width: bitmap.width, height: bitmap.height }
}

async function litIn(blob: Blob) {
  const bitmap = await createImageBitmap(blob)
  const plate = document.createElement('canvas')

  plate.width = bitmap.width
  plate.height = bitmap.height
  plate.getContext('2d')?.drawImage(bitmap, 0, 0)

  const pixels = plate
    .getContext('2d')
    ?.getImageData(0, 0, plate.width, plate.height).data as Uint8ClampedArray
  let lit = 0

  for (let at = 0; at < pixels.length; at += 4) {
    if (pixels[at] > 40 || pixels[at + 1] > 40 || pixels[at + 2] > 40) {
      lit += 1
    }
  }

  return lit / (pixels.length / 4)
}

export const キャプチャ: Story = {
  args: {
    detail: detail('1266'),
    startAt: 0,
    pictureHref: () => DRAWN_PICTURE,
    takeCapture: capturing,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await showing(canvasElement)

    taken.length = 0
    await userEvent.click(canvas.getByRole('button', { name: 'キャプチャ' }))
    await waitFor(() => expect(taken).toHaveLength(1))

    const got = taken[0]

    await expect(got.name).toBe(`${detail('1266').title} 0-00.png`)
    await expect(got.blob?.type).toBe('image/png')
    await expect(await sizeOf(got.blob as Blob)).toEqual({
      width: 640,
      height: 360,
    })
    await expect(await litIn(got.blob as Blob)).toBeGreaterThan(0.1)
    await expect(canvas.getByText('キャプチャを保存しました。')).toBeVisible()
  },
}

export const キャプチャを断られる: Story = {
  args: {
    detail: detail('1266'),
    startAt: 0,
    pictureHref: () => DRAWN_PICTURE,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await showing(canvasElement)

    const reading = CanvasRenderingContext2D.prototype.getImageData

    CanvasRenderingContext2D.prototype.getImageData = () => {
      throw new DOMException(
        'Tainted canvases may not be exported.',
        'SecurityError',
      )
    }

    try {
      await userEvent.click(canvas.getByRole('button', { name: 'キャプチャ' }))
      await waitFor(() =>
        expect(canvas.getByText('この映像は保存できません')).toBeVisible(),
      )
    } finally {
      CanvasRenderingContext2D.prototype.getImageData = reading
    }

    await expect(
      canvas.getByRole('button', { name: 'キャプチャ' }),
    ).toBeEnabled()
    await expect(
      canvasElement.querySelector('video') as HTMLVideoElement,
    ).toBeVisible()
  },
}

function pictureOut(canvasElement: HTMLElement, out: boolean) {
  const picture = canvasElement.querySelector('video') as HTMLVideoElement

  Object.defineProperty(document, 'pictureInPictureElement', {
    value: out ? picture : null,
    configurable: true,
  })
  picture.dispatchEvent(
    new Event(out ? 'enterpictureinpicture' : 'leavepictureinpicture', {
      bubbles: true,
    }),
  )
}

function pictureBack() {
  Reflect.deleteProperty(document, 'pictureInPictureElement')
}

export const ピクチャーインピクチャー: Story = {
  args: {
    detail: detail('1266'),
    startAt: 0,
    pictureHref: () => DRAWN_PICTURE,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await showing(canvasElement)

    const control = canvas.getByRole('button', {
      name: 'ピクチャーインピクチャー',
    })

    await expect(control).toHaveAttribute('aria-pressed', 'false')
    await expect(
      canvas.queryByText('ピクチャーインピクチャーで再生中'),
    ).toBeNull()

    try {
      pictureOut(canvasElement, true)

      await waitFor(() =>
        expect(control).toHaveAttribute('aria-pressed', 'true'),
      )
      await expect(
        canvas.getByText('ピクチャーインピクチャーで再生中'),
      ).toBeVisible()
      await expect(
        canvasElement.querySelector('[data-slot="player-press"]'),
      ).toBeNull()
      await expect(
        canvasElement.querySelector('[data-slot="player-chrome"]'),
      ).toHaveAttribute('data-up', 'true')

      pictureOut(canvasElement, false)

      await waitFor(() =>
        expect(control).toHaveAttribute('aria-pressed', 'false'),
      )
      await expect(
        canvas.queryByText('ピクチャーインピクチャーで再生中'),
      ).toBeNull()
      await expect(
        canvasElement.querySelector('[data-slot="player-press"]'),
      ).not.toBeNull()
    } finally {
      pictureBack()
    }
  },
}

export const ピクチャーインピクチャーを断るブラウザ: Story = {
  args: {
    detail: detail('1266'),
    startAt: 0,
    pictureHref: () => DRAWN_PICTURE,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await showing(canvasElement)

    const picture = canvasElement.querySelector('video') as HTMLVideoElement

    picture.disablePictureInPicture = true
    picture.dispatchEvent(new Event('leavepictureinpicture', { bubbles: true }))

    await waitFor(() =>
      expect(
        canvas.queryByRole('button', { name: 'ピクチャーインピクチャー' }),
      ).toBeNull(),
    )
    await expect(
      canvas.getByRole('button', { name: 'キャプチャ' }),
    ).toBeVisible()
  },
}

export const ピクチャーインピクチャーを断る映像: Story = {
  args: {
    detail: detail('1266'),
    startAt: 0,
    pictureHref: () => DRAWN_PICTURE,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await showing(canvasElement)

    const picture = canvasElement.querySelector('video') as HTMLVideoElement

    await expect(
      canvas.getByRole('button', { name: 'ピクチャーインピクチャー' }),
    ).toBeVisible()

    Object.defineProperty(picture, 'webkitSupportsPresentationMode', {
      value: (mode: string) => mode !== 'picture-in-picture',
      configurable: true,
    })
    picture.dispatchEvent(new Event('leavepictureinpicture', { bubbles: true }))

    await waitFor(() =>
      expect(
        canvas.queryByRole('button', { name: 'ピクチャーインピクチャー' }),
      ).toBeNull(),
    )
    await expect(canvas.getByRole('button', { name: '全画面' })).toBeVisible()
  },
}

function tipOf(canvasElement: HTMLElement, name: string | RegExp): HTMLElement {
  const bar = canvasElement.querySelector('[data-slot="player-chrome"]')

  if (!(bar instanceof HTMLElement)) {
    throw new Error('the bar is not on the screen')
  }

  const control = within(bar).getByRole('button', { name })
  const held = control.closest('[data-slot="player-tip"]')

  if (!(held instanceof HTMLElement)) {
    throw new Error(`${name} is not held by anything that names it`)
  }

  return held
}

function named(canvasElement: HTMLElement): HTMLElement | null {
  return canvasElement.querySelector('[data-slot="player-tip-name"]')
}

function capsOn(said: HTMLElement): string[] {
  return [...said.querySelectorAll('kbd')].map((cap) => cap.textContent ?? '')
}

async function restOn(canvasElement: HTMLElement, name: string | RegExp) {
  await userEvent.hover(tipOf(canvasElement, name))
  await waitFor(() => expect(named(canvasElement)).not.toBeNull(), {
    timeout: 3000,
  })

  return named(canvasElement) as HTMLElement
}

export const 操作子の名前は待ってから出る: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.hover(tipOf(canvasElement, '再生'))
    await expect(named(canvasElement)).toBeNull()

    await waitFor(() => expect(named(canvasElement)).not.toBeNull(), {
      timeout: 3000,
    })

    const said = named(canvasElement) as HTMLElement

    await expect(said).toHaveTextContent('再生')
    await expect(capsOn(said)).toEqual(['Space'])

    const bubble = said.getBoundingClientRect()
    const on = tipOf(canvasElement, '再生').getBoundingClientRect()
    const board = (
      canvasElement.querySelector('[data-slot="player"]') as HTMLElement
    ).getBoundingClientRect()

    await expect(bubble.bottom).toBeLessThanOrEqual(on.top)
    await expect(bubble.top).toBeGreaterThanOrEqual(board.top)
    await expect(bubble.left).toBeGreaterThanOrEqual(board.left)
    await expect(bubble.right).toBeLessThanOrEqual(board.right)
  },
}

export const 鍵を持たない操作子は名前だけ: Story = {
  play: async ({ canvasElement }) => {
    const said = await restOn(canvasElement, 'キャプチャ')

    await expect(said).toHaveTextContent('キャプチャ')
    await expect(capsOn(said)).toEqual([])
  },
}

export const 押せない操作子にも名前は出る: Story = {
  args: { detail: detail('1266') },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('button', { name: 'キャプチャ' }),
    ).toBeDisabled()

    const said = await restOn(canvasElement, 'キャプチャ')

    await expect(said).toHaveTextContent('キャプチャ')
    await expect(capsOn(said)).toEqual([])
    await expect(said).not.toHaveTextContent('これから')
  },
}

export const 隣へ移ってもまた待つ: Story = {
  play: async ({ canvasElement }) => {
    const full = await restOn(canvasElement, '全画面')

    await expect(capsOn(full)).toEqual(['F'])

    await userEvent.unhover(tipOf(canvasElement, '全画面'))
    await waitFor(() => expect(named(canvasElement)).toBeNull())

    await userEvent.hover(tipOf(canvasElement, '消音'))
    await expect(named(canvasElement)).toBeNull()

    await waitFor(() => expect(named(canvasElement)).not.toBeNull(), {
      timeout: 3000,
    })

    const said = named(canvasElement) as HTMLElement

    await expect(said).toHaveTextContent('消音')
    await expect(capsOn(said)).toEqual(['M'])
  },
}

export const チャプターを持たない録画: Story = {
  args: { detail: detail('1266'), plan: HANDED_OVER, pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.queryByRole('button', { name: NEXT_CHAPTER }),
    ).toBeNull()
    await expect(marksOn(canvasElement, 'CM と判定した区間')).toBe(0)
    await expect(marksOn(canvasElement, 'チャプターの区切り')).toBe(0)
  },
}

export const CM区間の印: Story = {
  args: { detail: detail('1266'), plan: MARKED, pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(marksOn(canvasElement, 'CM と判定した区間')).toBe(2)
    await expect(marksOn(canvasElement, 'チャプターの区切り')).toBe(4)
    await expect(
      canvas.getByRole('button', { name: NEXT_CHAPTER }),
    ).toBeEnabled()
  },
}

export const 最後の区切りより後: Story = {
  args: {
    detail: detail('1266'),
    plan: MARKED,
    startAt: 14000,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('button', { name: NEXT_CHAPTER }),
    ).toBeDisabled()
    await expect(marksOn(canvasElement, 'チャプターの区切り')).toBe(4)
  },
}

export const 押すと次の区切りへ飛ぶ: Story = {
  args: { detail: detail('1266'), plan: MARKED, pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('0:00 / 4:12:38')).toBeVisible()

    await userEvent.click(canvas.getByRole('button', { name: NEXT_CHAPTER }))

    await waitFor(() =>
      expect(canvas.getByText('20:00 / 4:12:38')).toBeVisible(),
    )
  },
}

export const 放っておいても飛ばされない: Story = {
  args: {
    detail: detail('1266'),
    plan: MARKED,
    startAt: 1250,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('20:50 / 4:12:38')).toBeVisible()
    await expect(
      canvas.getByRole('button', { name: NEXT_CHAPTER }),
    ).toBeEnabled()

    await new Promise((rest) => setTimeout(rest, 800))

    await expect(canvas.getByText('20:50 / 4:12:38')).toBeVisible()
  },
}

export const 続きの位置で待っている: Story = {
  args: {
    detail: detail('1266'),
    plan: MARKED,
    startAt: 1250,
    playsAtOnce: false,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const picture = canvasElement.querySelector('video')

    await expect(picture?.getAttribute('src')).toBeNull()
    await expect(canvas.getByText('20:50 / 4:12:38')).toBeVisible()
    await expect(
      canvas.getAllByRole('button', { name: '再生' }).length,
    ).toBeGreaterThan(0)
  },
}

export const アドレスで名指しされた位置から再生する: Story = {
  args: {
    detail: detail('1266'),
    plan: MARKED,
    startAt: 1250,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const picture = canvasElement.querySelector('video')

    await expect(picture?.getAttribute('src')).not.toBeNull()
    await expect(canvas.getByText('20:50 / 4:12:38')).toBeVisible()
  },
}

export const 見ていた位置を覚える: Story = {
  args: {
    detail: detail('1266'),
    plan: MARKED,
    startAt: 1250,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    kept.length = 0

    const canvas = within(canvasElement)
    const picture = canvasElement.querySelector('video')

    if (!picture) {
      throw new Error('the player is drawn without a picture to play')
    }

    picture.dispatchEvent(new Event('playing'))

    await waitFor(() =>
      expect(canvas.getByRole('button', { name: '一時停止' })).toBeEnabled(),
    )

    picture.dispatchEvent(new Event('pause'))

    await waitFor(() => expect(kept).toEqual([1250]))
  },
}

function pressArea(canvasElement: HTMLElement): HTMLElement {
  const found = canvasElement.querySelector('[data-slot="player-press"]')

  if (!(found instanceof HTMLElement)) {
    throw new Error('the picture has nothing to press')
  }

  return found
}

async function tapAt(
  area: HTMLElement,
  share: number,
  times: number,
  pointer: 'mouse' | 'touch' = 'mouse',
) {
  const box = area.getBoundingClientRect()
  const coords = {
    clientX: box.left + box.width * share,
    clientY: box.top + box.height / 2,
  }
  const key = pointer === 'touch' ? '[TouchA]' : '[MouseLeft]'

  await userEvent.pointer(
    Array.from({ length: times }, () => ({ keys: key, target: area, coords })),
  )
}

function seekMark(canvasElement: HTMLElement) {
  return canvasElement.querySelector('[data-slot="player-seek-flash"]')
}

function bezelOn(canvasElement: HTMLElement) {
  return canvasElement.querySelector('[data-slot="player-center-bezel"]')
}

export const 右を二度叩くと10秒進み_続けて叩くと重なる: Story = {
  args: { detail: detail('1266'), startAt: 600, pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const area = pressArea(canvasElement)

    await tapAt(area, 5 / 6, 2)
    await waitFor(() =>
      expect(seekMark(canvasElement)).toHaveAttribute('data-way', 'forward'),
    )
    await expect(seekMark(canvasElement)).toHaveTextContent('10 秒')
    await expect(canvas.getByText('10:10 / 4:12:38')).toBeVisible()

    await tapAt(area, 5 / 6, 1)
    await waitFor(() =>
      expect(seekMark(canvasElement)).toHaveTextContent('20 秒'),
    )
    await tapAt(area, 5 / 6, 1)
    await waitFor(() =>
      expect(seekMark(canvasElement)).toHaveTextContent('30 秒'),
    )
    await expect(canvas.getByText('10:30 / 4:12:38')).toBeVisible()

    await new Promise((rest) => setTimeout(rest, 400))
    await expect(bezelOn(canvasElement)).toBeNull()
    await expect(document.fullscreenElement).toBeNull()
  },
}

export const 左を二度叩くと10秒戻る: Story = {
  args: { detail: detail('1266'), startAt: 600, pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await tapAt(pressArea(canvasElement), 1 / 6, 2)
    await waitFor(() =>
      expect(seekMark(canvasElement)).toHaveAttribute('data-way', 'back'),
    )
    await expect(seekMark(canvasElement)).toHaveTextContent('10 秒')
    await expect(canvas.getByText('9:50 / 4:12:38')).toBeVisible()
    await expect(document.fullscreenElement).toBeNull()
  },
}

export const 指で二度叩いても送る: Story = {
  args: { detail: detail('1266'), startAt: 600, pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const area = pressArea(canvasElement)

    await tapAt(area, 5 / 6, 2, 'touch')
    await waitFor(() =>
      expect(seekMark(canvasElement)).toHaveTextContent('10 秒'),
    )
    await tapAt(area, 5 / 6, 1, 'touch')
    await waitFor(() =>
      expect(seekMark(canvasElement)).toHaveTextContent('20 秒'),
    )
    await expect(canvas.getByText('10:20 / 4:12:38')).toBeVisible()
    await expect(getComputedStyle(area).touchAction).toBe('manipulation')
  },
}

export const 時計が合わせ直されても秒数は重なる: Story = {
  args: { detail: detail('1266'), startAt: 600, pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const area = pressArea(canvasElement)
    const wall = Date.now

    await tapAt(area, 5 / 6, 2)
    await waitFor(() =>
      expect(seekMark(canvasElement)).toHaveTextContent('10 秒'),
    )

    Date.now = () => wall() + 60_000

    try {
      await tapAt(area, 5 / 6, 1)
      await waitFor(() =>
        expect(seekMark(canvasElement)).toHaveTextContent('20 秒'),
      )
    } finally {
      Date.now = wall
    }
  },
}

export const 左右を一度だけ叩くと待ってから再生する: Story = {
  args: { detail: detail('1266'), pictureHref: keeping },
  play: async ({ canvasElement }) => {
    asked.length = 0

    await tapAt(pressArea(canvasElement), 5 / 6, 1)
    await expect(asked).toEqual([])
    await expect(bezelOn(canvasElement)).toBeNull()

    await waitFor(() => expect(asked).toEqual(['0/1080p60']))
    await expect(seekMark(canvasElement)).toBeNull()
  },
}

export const 真ん中の一度は待たずに再生する: Story = {
  args: { detail: detail('1266'), pictureHref: keeping },
  play: async ({ canvasElement }) => {
    asked.length = 0

    await tapAt(pressArea(canvasElement), 1 / 2, 1)
    await expect(asked).toEqual(['0/1080p60'])
  },
}

export const 長さの分からない録画は左右も待たない: Story = {
  args: {
    detail: { ...detail('1266'), lengthSec: undefined },
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    asked.length = 0

    await tapAt(pressArea(canvasElement), 5 / 6, 1)
    await expect(asked.length).toBe(1)
  },
}

export const バーの上を二度叩いても送らない: Story = {
  args: { detail: detail('1266'), startAt: 600, pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const time = canvas.getByText('10:00 / 4:12:38')

    await userEvent.dblClick(time)
    await new Promise((rest) => setTimeout(rest, 400))

    await expect(seekMark(canvasElement)).toBeNull()
    await expect(canvas.getByText('10:00 / 4:12:38')).toBeVisible()
  },
}

export const CM区間ではCMを飛ばすが出る: Story = {
  args: {
    detail: detail('1266'),
    plan: MARKED,
    startAt: 1250,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const skip = canvas.getByRole('button', { name: SKIP_THE_BREAK })

    await expect(skip).toBeVisible()
    await expect(canvas.getByRole('button', { name: '閉じる' })).toBeVisible()
    await expect(
      canvasElement.querySelector('[data-slot="player-skip"]'),
    ).toHaveAttribute('data-raised', 'true')
  },
}

export const CMを飛ばすとその区間の終わりへ: Story = {
  args: {
    detail: detail('1266'),
    plan: MARKED,
    startAt: 1250,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: SKIP_THE_BREAK }))

    await waitFor(() =>
      expect(canvas.getByText('22:00 / 4:12:38')).toBeVisible(),
    )
    await expect(
      canvas.queryByRole('button', { name: SKIP_THE_BREAK }),
    ).toBeNull()
    await expect(document.activeElement).toBe(board(canvasElement))
  },
}

export const 閉じたCM区間では出さない: Story = {
  args: {
    detail: detail('1266'),
    plan: MARKED,
    startAt: 1250,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '閉じる' }))
    await expect(
      canvas.queryByRole('button', { name: SKIP_THE_BREAK }),
    ).toBeNull()

    await userEvent.click(canvas.getByRole('button', { name: '10 秒進む' }))
    await waitFor(() =>
      expect(canvas.getByText('21:00 / 4:12:38')).toBeVisible(),
    )
    await expect(
      canvas.queryByRole('button', { name: SKIP_THE_BREAK }),
    ).toBeNull()

    await userEvent.click(canvas.getByRole('button', { name: NEXT_CHAPTER }))
    await userEvent.click(canvas.getByRole('button', { name: NEXT_CHAPTER }))
    await waitFor(() =>
      expect(canvas.getByText('1:00:00 / 4:12:38')).toBeVisible(),
    )
    await expect(
      canvas.getByRole('button', { name: SKIP_THE_BREAK }),
    ).toBeVisible()
  },
}

export const 飛ばせないCM区間は印だけ: Story = {
  args: {
    detail: detail('1266'),
    plan: MARKED_BUT_NOT_TO_SKIP,
    startAt: 1250,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(marksOn(canvasElement, 'CM と判定した区間')).toBe(2)
    await expect(marksOn(canvasElement, 'チャプターの区切り')).toBe(4)
    await expect(
      canvas.getByRole('button', { name: NEXT_CHAPTER }),
    ).toBeEnabled()
    await expect(
      canvas.queryByRole('button', { name: SKIP_THE_BREAK }),
    ).toBeNull()
  },
}

export const 元のままの再生でもCMの印と飛ばすが出る: Story = {
  args: {
    detail: detail('1266'),
    plan: THE_RECORDING_ITSELF_MARKED,
    startAt: 1250,
    pictureHref: carryingTheSource,
    feedRecording: keptForTheFeed,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(marksOn(canvasElement, 'CM と判定した区間')).toBe(2)
    await expect(marksOn(canvasElement, 'チャプターの区切り')).toBe(4)

    await userEvent.click(canvas.getByRole('button', { name: SKIP_THE_BREAK }))

    await waitFor(() =>
      expect(canvas.getByText('22:00 / 4:12:38')).toBeVisible(),
    )
    await waitFor(() => expect(asked.at(-1)).toContain('from=1320'))
    await expect(asked.at(-1)).toContain('source=recording')
    await expect(
      canvas.queryByRole('button', { name: SKIP_THE_BREAK }),
    ).toBeNull()
  },
}

export const 知らない種類の区間は印も飛ぶ先も持たない: Story = {
  args: {
    detail: detail('1266'),
    plan: MARKED_WITH_AN_UNKNOWN_KIND,
    startAt: 600,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(marksOn(canvasElement, 'CM と判定した区間')).toBe(1)
    await expect(marksOn(canvasElement, 'チャプターの区切り')).toBe(3)

    await userEvent.click(canvas.getByRole('button', { name: NEXT_CHAPTER }))
    await waitFor(() =>
      expect(canvas.getByText('22:00 / 4:12:38')).toBeVisible(),
    )

    await userEvent.click(canvas.getByRole('button', { name: '10 秒戻る' }))
    await waitFor(() =>
      expect(canvas.getByText('21:50 / 4:12:38')).toBeVisible(),
    )
    await expect(
      canvas.queryByRole('button', { name: SKIP_THE_BREAK }),
    ).toBeNull()
  },
}

export const 本編ではCMを飛ばすは出ない: Story = {
  args: {
    detail: detail('1266'),
    plan: MARKED,
    startAt: 600,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).queryByRole('button', { name: SKIP_THE_BREAK }),
    ).toBeNull()
  },
}

export const 最後まで続くCMでは出さない: Story = {
  args: {
    detail: detail('1266'),
    plan: ENDS_IN_A_BREAK,
    startAt: 15000,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(marksOn(canvasElement, 'CM と判定した区間')).toBe(1)
    await expect(
      canvas.queryByRole('button', { name: SKIP_THE_BREAK }),
    ).toBeNull()
  },
}

export const まだ再生していなければCMを飛ばすは出ない: Story = {
  args: {
    detail: detail('1266'),
    plan: MARKED,
    startAt: 1250,
    playsAtOnce: false,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).queryByRole('button', { name: SKIP_THE_BREAK }),
    ).toBeNull()
  },
}

export const 操作列が消えるとCMを飛ばすは下へ戻る: Story = {
  args: {
    detail: detail('1266'),
    plan: MARKED,
    startAt: 1250,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const skip = () => canvasElement.querySelector('[data-slot="player-skip"]')

    canvasElement.querySelector('video')?.dispatchEvent(new Event('playing'))
    await waitFor(() => expect(skip()).toHaveAttribute('data-raised', 'true'))
    await waitFor(() => expect(skip()).not.toHaveAttribute('data-raised'), {
      timeout: 4500,
    })
    await expect(
      within(canvasElement).getByRole('button', { name: SKIP_THE_BREAK }),
    ).toBeVisible()

    board(canvasElement).dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true }),
    )
    await waitFor(() => expect(skip()).toHaveAttribute('data-raised', 'true'))
  },
}

export const 動きを止めていると印は育たない: Story = {
  args: {
    detail: detail('1266'),
    plan: MARKED,
    startAt: 1250,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const root = document.documentElement
    const was = root.dataset.motion

    root.dataset.motion = 'still'

    try {
      const player = board(canvasElement)

      aim(player)
      press(player, 'ArrowRight')
      await waitFor(() => expect(seekMark(canvasElement)).not.toBeNull())

      const mark = seekMark(canvasElement) as Element

      await expect(getComputedStyle(mark).animationName).toBe('player-shown')
      await expect(getComputedStyle(mark).animationDuration).toBe('0.7s')
      await expect(
        getComputedStyle(mark.querySelector('svg') as Element).animationName,
      ).toBe('none')

      press(player, 'ArrowUp')
      await waitFor(() => expect(bezelOn(canvasElement)).not.toBeNull())
      await expect(
        getComputedStyle(bezelOn(canvasElement)?.lastElementChild as Element)
          .animationName,
      ).toBe('player-shown')

      const skip = canvasElement.querySelector(
        '[data-slot="player-skip"]',
      ) as Element

      await expect(getComputedStyle(skip).transitionProperty).toBe('none')
      await expect(getComputedStyle(skip).animationName).toBe('none')
    } finally {
      if (was === undefined) {
        delete root.dataset.motion
      } else {
        root.dataset.motion = was
      }
    }
  },
}

function bandOf(canvasElement: HTMLElement, named: string) {
  const band = canvasElement.querySelector(`[title="${named}"]`)

  return band ? getComputedStyle(band).backgroundImage : undefined
}

async function themesAreMarked(canvasElement: HTMLElement) {
  await expect(marksOn(canvasElement, 'OP と判定した区間')).toBe(1)
  await expect(marksOn(canvasElement, 'ED と判定した区間')).toBe(1)
  await expect(marksOn(canvasElement, 'CM と判定した区間')).toBe(1)
  await expect(marksOn(canvasElement, 'チャプターの区切り')).toBe(6)

  const opening = bandOf(canvasElement, 'OP と判定した区間')
  const ending = bandOf(canvasElement, 'ED と判定した区間')
  const theBreak = bandOf(canvasElement, 'CM と判定した区間')

  await expect(opening).toBe(ending)
  await expect(opening).not.toBe(theBreak)
}

export const OPとEDの印: Story = {
  args: { detail: detail('1266'), plan: THEMED, pictureHref: keeping },
  play: async ({ canvasElement }) => {
    await themesAreMarked(canvasElement)
  },
}

export const OPとEDの印_ダーク: Story = {
  args: { detail: detail('1266'), plan: THEMED, pictureHref: keeping },
  globals: { theme: 'dark' },
  play: async ({ canvasElement }) => {
    await themesAreMarked(canvasElement)
  },
}

export const OP区間ではOPを飛ばすが出る: Story = {
  args: {
    detail: detail('1266'),
    plan: THEMED,
    startAt: 120,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('button', { name: SKIP_THE_OPENING }),
    ).toBeVisible()
    await expect(
      canvas.getAllByRole('button', { name: ANY_SKIP }),
    ).toHaveLength(1)
    await expect(canvas.getByRole('button', { name: '閉じる' })).toBeVisible()
  },
}

export const OPを飛ばすとその区間の終わりへ: Story = {
  args: {
    detail: detail('1266'),
    plan: THEMED,
    startAt: 120,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: SKIP_THE_OPENING }),
    )

    await waitFor(() =>
      expect(canvas.getByText('3:00 / 4:12:38')).toBeVisible(),
    )
    await expect(canvas.queryByRole('button', { name: ANY_SKIP })).toBeNull()
    await expect(document.activeElement).toBe(board(canvasElement))
  },
}

export const 閉じたOP区間では出さない: Story = {
  args: {
    detail: detail('1266'),
    plan: THEMED,
    startAt: 120,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '閉じる' }))
    await expect(
      canvas.queryByRole('button', { name: SKIP_THE_OPENING }),
    ).toBeNull()

    await userEvent.click(canvas.getByRole('button', { name: '10 秒進む' }))
    await waitFor(() =>
      expect(canvas.getByText('2:10 / 4:12:38')).toBeVisible(),
    )
    await expect(
      canvas.queryByRole('button', { name: SKIP_THE_OPENING }),
    ).toBeNull()

    await userEvent.click(canvas.getByRole('button', { name: NEXT_CHAPTER }))
    await userEvent.click(canvas.getByRole('button', { name: NEXT_CHAPTER }))
    await waitFor(() =>
      expect(canvas.getByText('20:00 / 4:12:38')).toBeVisible(),
    )
    await expect(
      canvas.getByRole('button', { name: SKIP_THE_BREAK }),
    ).toBeVisible()
  },
}

export const ED区間ではEDを飛ばすが出る: Story = {
  args: {
    detail: detail('1266'),
    plan: THEMED,
    startAt: 14820,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('button', { name: SKIP_THE_ENDING }),
    ).toBeVisible()
    await expect(
      canvas.getAllByRole('button', { name: ANY_SKIP }),
    ).toHaveLength(1)
  },
}

export const EDを飛ばすとその後ろの続きへ: Story = {
  args: {
    detail: detail('1266'),
    plan: THEMED,
    startAt: 14820,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: SKIP_THE_ENDING }))

    await waitFor(() =>
      expect(canvas.getByText('4:08:10 / 4:12:38')).toBeVisible(),
    )
    await expect(canvas.queryByRole('button', { name: ANY_SKIP })).toBeNull()
  },
}

export const 閉じたED区間では出さない: Story = {
  args: {
    detail: detail('1266'),
    plan: THEMED,
    startAt: 14820,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '閉じる' }))
    await expect(canvas.queryByRole('button', { name: ANY_SKIP })).toBeNull()

    await userEvent.click(canvas.getByRole('button', { name: '10 秒戻る' }))
    await waitFor(() =>
      expect(canvas.getByText('4:06:50 / 4:12:38')).toBeVisible(),
    )
    await expect(
      canvas.queryByRole('button', { name: SKIP_THE_ENDING }),
    ).toBeNull()
  },
}

export const OPのすぐ後のCMはまとめて飛ばす: Story = {
  args: {
    detail: detail('1266'),
    plan: OPENING_THEN_A_BREAK,
    startAt: 100,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getAllByRole('button', { name: ANY_SKIP }),
    ).toHaveLength(1)
    await userEvent.click(
      canvas.getByRole('button', { name: SKIP_THE_OPENING_AND_THE_BREAK }),
    )

    await waitFor(() =>
      expect(canvas.getByText('4:00 / 4:12:38')).toBeVisible(),
    )
    await expect(canvas.queryByRole('button', { name: ANY_SKIP })).toBeNull()
    await expect(document.activeElement).toBe(board(canvasElement))
  },
}

export const OPのすぐ後のCMの中ではCMだけを飛ばす: Story = {
  args: {
    detail: detail('1266'),
    plan: OPENING_THEN_A_BREAK,
    startAt: 200,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: SKIP_THE_BREAK }))

    await waitFor(() =>
      expect(canvas.getByText('4:00 / 4:12:38')).toBeVisible(),
    )
  },
}

export const OPを閉じるとすぐ後のCMで改めて出す: Story = {
  args: {
    detail: detail('1266'),
    plan: OPENING_THEN_A_BREAK,
    startAt: 100,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '閉じる' }))
    await expect(canvas.queryByRole('button', { name: ANY_SKIP })).toBeNull()

    await userEvent.click(canvas.getByRole('button', { name: '10 秒進む' }))
    await waitFor(() =>
      expect(canvas.getByText('1:50 / 4:12:38')).toBeVisible(),
    )
    await expect(canvas.queryByRole('button', { name: ANY_SKIP })).toBeNull()

    await userEvent.click(canvas.getByRole('button', { name: NEXT_CHAPTER }))
    await waitFor(() =>
      expect(canvas.getByText('3:00 / 4:12:38')).toBeVisible(),
    )
    await expect(
      await canvas.findByRole('button', { name: SKIP_THE_BREAK }),
    ).toBeVisible()
    await expect(
      canvas.getAllByRole('button', { name: ANY_SKIP }),
    ).toHaveLength(1)
  },
}

export const 飛ばせないCMの手前のOPはOPだけを飛ばす: Story = {
  args: {
    detail: detail('1266'),
    plan: OPENING_THEN_A_HELD_BACK_BREAK,
    startAt: 100,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: SKIP_THE_OPENING }),
    )

    await waitFor(() =>
      expect(canvas.getByText('3:00 / 4:12:38')).toBeVisible(),
    )
    await expect(canvas.queryByRole('button', { name: ANY_SKIP })).toBeNull()
  },
}

function skipSeat(canvasElement: HTMLElement): HTMLElement {
  const seat = canvasElement.querySelector('[data-slot="player-skip"]')

  if (!(seat instanceof HTMLElement)) {
    throw new Error('the skip is not on the screen')
  }

  return seat
}

async function sitsAtTheRightOfTheLastLine(canvasElement: HTMLElement) {
  const seat = skipSeat(canvasElement).getBoundingClientRect()
  const full = within(canvasElement)
    .getByRole('button', { name: '全画面' })
    .getBoundingClientRect()
  const controls = canvasElement
    .querySelector('[data-slot="player-controls"]')
    ?.getBoundingClientRect()

  await expect(skipSeat(canvasElement)).toHaveAttribute('data-place', 'row')
  await expect(Math.round(seat.top)).toBe(Math.round(full.top))
  await expect(seat.left).toBeGreaterThan(full.right)
  await expect(Math.round(controls?.right ?? 0) - Math.round(seat.right)).toBe(
    12,
  )
}

const NARROW = { width: 375, height: 740 }

export const 幅375ではバーの最下段の右端に出す: Story = {
  args: {
    detail: detail('1266'),
    plan: THEMED,
    startAt: 120,
    pictureHref: keeping,
  },
  parameters: { screen: NARROW },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => sitsAtTheRightOfTheLastLine(canvasElement))
    await userEvent.click(
      canvas.getByRole('button', { name: SKIP_THE_OPENING }),
    )
    await waitFor(() =>
      expect(canvas.getByText('3:00 / 4:12:38')).toBeVisible(),
    )
    await expect(canvas.queryByRole('button', { name: ANY_SKIP })).toBeNull()
  },
}

export const 幅375で2種類は飛ばすに縮める: Story = {
  args: {
    detail: detail('1266'),
    plan: OPENING_THEN_A_BREAK,
    startAt: 100,
    pictureHref: keeping,
  },
  parameters: { screen: { width: 375, height: 740 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => sitsAtTheRightOfTheLastLine(canvasElement))

    const skip = canvas.getByRole('button', {
      name: SKIP_THE_OPENING_AND_THE_BREAK,
    })

    await expect(skip.textContent).toBe(SKIP_ONLY)
    await userEvent.click(skip)
    await waitFor(() =>
      expect(canvas.getByText('4:00 / 4:12:38')).toBeVisible(),
    )
  },
}

export const 幅375で3種類は飛ばすに縮める: Story = {
  args: {
    detail: detail('1266'),
    plan: OPENING_BREAK_AND_ENDING,
    startAt: 100,
    pictureHref: keeping,
  },
  parameters: { screen: { width: 375, height: 740 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => sitsAtTheRightOfTheLastLine(canvasElement))

    const skip = canvas.getByRole('button', { name: 'OP と CM と ED を飛ばす' })

    await expect(skip.textContent).toBe(SKIP_ONLY)
    await userEvent.click(skip)
    await waitFor(() =>
      expect(canvas.getByText('5:30 / 4:12:38')).toBeVisible(),
    )
  },
}

export const 幅375でバーが隠れると映像の右下に戻る: Story = {
  args: {
    detail: detail('1266'),
    plan: OPENING_THEN_A_BREAK,
    startAt: 100,
    pictureHref: keeping,
  },
  parameters: { screen: NARROW },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    canvasElement.querySelector('video')?.dispatchEvent(new Event('playing'))
    await waitFor(
      () => expect(skipSeat(canvasElement)).not.toHaveAttribute('data-place'),
      { timeout: 4500 },
    )
    await expect(skipSeat(canvasElement)).not.toHaveAttribute('data-raised')
    await expect(
      canvas.getByRole('button', { name: SKIP_THE_OPENING_AND_THE_BREAK }),
    ).toBeVisible()

    board(canvasElement).dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true }),
    )
    await waitFor(() =>
      expect(skipSeat(canvasElement)).toHaveAttribute('data-place', 'row'),
    )
  },
}

export const 幅393で2種類が入らないときは飛ばすに縮める: Story = {
  args: {
    detail: detail('1266'),
    plan: OPENING_THEN_A_BREAK,
    startAt: 100,
    pictureHref: keeping,
  },
  parameters: { screen: { width: 393, height: 740 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => sitsAtTheRightOfTheLastLine(canvasElement))

    const skip = canvas.getByRole('button', {
      name: SKIP_THE_OPENING_AND_THE_BREAK,
    })

    await expect(skip.textContent).toBe(SKIP_ONLY)
    await userEvent.click(skip)
    await waitFor(() =>
      expect(canvas.getByText('4:00 / 4:12:38')).toBeVisible(),
    )
  },
}

export const 幅414では2種類をプラスでつないで出す: Story = {
  args: {
    detail: detail('1266'),
    plan: OPENING_THEN_A_BREAK,
    startAt: 100,
    pictureHref: keeping,
  },
  parameters: { screen: { width: 414, height: 740 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => sitsAtTheRightOfTheLastLine(canvasElement))

    const skip = canvas.getByRole('button', {
      name: SKIP_THE_OPENING_AND_THE_BREAK,
    })

    await expect(skip.textContent).toBe('OP+CM を飛ばす')
    await userEvent.click(skip)
    await waitFor(() =>
      expect(canvas.getByText('4:00 / 4:12:38')).toBeVisible(),
    )
  },
}

export const 幅414で3種類が入らないときは飛ばすに縮める: Story = {
  args: {
    detail: detail('1266'),
    plan: OPENING_BREAK_AND_ENDING,
    startAt: 100,
    pictureHref: keeping,
  },
  parameters: { screen: { width: 414, height: 740 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => sitsAtTheRightOfTheLastLine(canvasElement))

    const skip = canvas.getByRole('button', { name: 'OP と CM と ED を飛ばす' })

    await expect(skip.textContent).toBe(SKIP_ONLY)
    await userEvent.click(skip)
    await waitFor(() =>
      expect(canvas.getByText('5:30 / 4:12:38')).toBeVisible(),
    )
  },
}

export const 幅430では今までどおり映像の上に出す: Story = {
  args: {
    detail: detail('1266'),
    plan: OPENING_THEN_A_BREAK,
    startAt: 100,
    pictureHref: keeping,
  },
  parameters: { screen: { width: 430, height: 740 } },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(skipSeat(canvasElement)).toHaveAttribute('data-raised', 'true'),
    )
    await expect(skipSeat(canvasElement)).not.toHaveAttribute('data-place')
    await expect(
      within(canvasElement).getByRole('button', {
        name: SKIP_THE_OPENING_AND_THE_BREAK,
      }),
    ).toBeVisible()
  },
}

export const 続いたCMは1回でまとめて飛ばす: Story = {
  args: {
    detail: detail('1266'),
    plan: BREAKS_BACK_TO_BACK,
    startAt: 1210,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: SKIP_THE_BREAK }))

    await waitFor(() =>
      expect(canvas.getByText('21:30 / 4:12:38')).toBeVisible(),
    )
    await expect(canvas.queryByRole('button', { name: ANY_SKIP })).toBeNull()
  },
}

export const 最後まで続くEDでは出さない: Story = {
  args: {
    detail: detail('1266'),
    plan: ENDS_IN_AN_ENDING,
    startAt: 15050,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    await expect(marksOn(canvasElement, 'ED と判定した区間')).toBe(1)
    await expect(
      within(canvasElement).queryByRole('button', { name: SKIP_THE_ENDING }),
    ).toBeNull()
  },
}

export const 飛ばせないOPとEDは印だけ: Story = {
  args: {
    detail: detail('1266'),
    plan: THEMED_BUT_NOT_TO_SKIP,
    startAt: 120,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(marksOn(canvasElement, 'OP と判定した区間')).toBe(1)
    await expect(marksOn(canvasElement, 'ED と判定した区間')).toBe(1)
    await expect(canvas.queryByRole('button', { name: ANY_SKIP })).toBeNull()
  },
}

export const 元のままの再生でもOPとEDの印と飛ばすが出る: Story = {
  args: {
    detail: detail('1266'),
    plan: THE_RECORDING_ITSELF_THEMED,
    startAt: 120,
    pictureHref: carryingTheSource,
    feedRecording: keptForTheFeed,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(marksOn(canvasElement, 'OP と判定した区間')).toBe(1)
    await expect(marksOn(canvasElement, 'ED と判定した区間')).toBe(1)

    await userEvent.click(
      canvas.getByRole('button', { name: SKIP_THE_OPENING }),
    )

    await waitFor(() =>
      expect(canvas.getByText('3:00 / 4:12:38')).toBeVisible(),
    )
    await waitFor(() => expect(asked.at(-1)).toContain('from=180'))
    await expect(asked.at(-1)).toContain('source=recording')
  },
}

const CAPTIONED: PlaybackPlan = { ...ON_THE_FLY, captions: 'ready' }

const CAPTIONS_COMING: PlaybackPlan = { ...ON_THE_FLY, captions: 'coming' }

const CAPTION_ALL_ALONG: CaptionWindow = {
  canvas: CAPTION_CANVAS_FIXTURE,
  untilSec: 600,
  cues: [{ atSec: 0, picture: CAPTION_PICTURE_FIXTURE }],
}

const captionsAsked: string[] = []

const readingTheCaptions: ReadCaptions = async (id, fromSec, source) => {
  captionsAsked.push(`${id}/${source ?? '—'}`)

  return { state: 'read', window: CAPTION_ALL_ALONG }
}

function captionLayer(canvasElement: HTMLElement): HTMLElement {
  const layer = canvasElement.querySelector('[data-slot="player-captions"]')

  if (!(layer instanceof HTMLElement)) {
    throw new Error('the caption layer is not on the screen')
  }

  return layer
}

function captionSays(canvasElement: HTMLElement, state: string) {
  return waitFor(
    () =>
      expect(captionLayer(canvasElement)).toHaveAttribute(
        'data-caption',
        state,
      ),
    { timeout: 10000 },
  )
}

const CAPTIONS_PLAYING = {
  detail: detail('1266'),
  plan: CAPTIONED,
  startAt: 0,
  pictureHref: () => DRAWN_PICTURE,
  readCaptions: readingTheCaptions,
}

export const 字幕のある録画は字幕を出す: Story = {
  args: CAPTIONS_PLAYING,
  beforeEach: () => {
    captionsAsked.length = 0
  },
  play: async ({ canvasElement }) => {
    const toggle = within(canvasElement).getByRole('button', { name: '字幕' })

    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await captionSays(canvasElement, 'shown')
    await expect(captionsAsked[0]).toBe('1266/—')
    await expect(captionLayer(canvasElement)).toHaveAttribute(
      'aria-hidden',
      'true',
    )
    await expect(
      getComputedStyle(captionLayer(canvasElement)).pointerEvents,
    ).toBe('none')

    const said = await restOn(canvasElement, '字幕')

    await expect(capsOn(said)).toEqual(['C'])
  },
}

export const 字幕は再生しているソースの秒で引く: Story = {
  args: {
    ...CAPTIONS_PLAYING,
    plan: { ...THE_RECORDING_ITSELF, captions: 'ready' },
  },
  beforeEach: () => {
    captionsAsked.length = 0
  },
  play: async ({ canvasElement }) => {
    await captionSays(canvasElement, 'shown')
    await expect(captionsAsked[0]).toBe('1266/recording')
  },
}

export const 字幕を切り替える: Story = {
  args: CAPTIONS_PLAYING,
  play: async ({ canvasElement }) => {
    const toggle = within(canvasElement).getByRole('button', { name: '字幕' })
    const player = board(canvasElement)

    await captionSays(canvasElement, 'shown')

    await userEvent.click(toggle)
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await captionSays(canvasElement, 'off')

    aim(player)
    press(player, 'c')
    await waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'true'))
    await captionSays(canvasElement, 'shown')

    press(player, 'c')
    await waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'false'))
  },
}

export const 字幕の無い録画は字幕を出さず_C_も取らない: Story = {
  args: { ...CAPTIONS_PLAYING, plan: ON_THE_FLY },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const player = board(canvasElement)

    await showing(canvasElement)
    await expect(canvas.queryByRole('button', { name: '字幕' })).toBeNull()
    await expect(
      canvasElement.querySelector('[data-slot="player-captions"]'),
    ).toBeNull()

    aim(player)

    const key = new KeyboardEvent('keydown', {
      key: 'c',
      bubbles: true,
      cancelable: true,
    })

    player.dispatchEvent(key)
    await expect(key.defaultPrevented).toBe(false)
  },
}

const captionsMade: { plan: PlaybackPlan; heard: Set<() => void> } = {
  plan: CAPTIONS_COMING,
  heard: new Set(),
}

function theCaptionsAre(plan: PlaybackPlan) {
  captionsMade.plan = plan
  captionsMade.heard.forEach((hear) => hear())
}

function hearingTheCaptions(hear: () => void) {
  captionsMade.heard.add(hear)

  return () => {
    captionsMade.heard.delete(hear)
  }
}

function SeatedWhileTheCaptionsAreMade(args: ComponentProps<typeof Player>) {
  const plan = useSyncExternalStore(hearingTheCaptions, () => captionsMade.plan)

  return <Player {...args} plan={plan} />
}

export const 字幕ができるまでは出さず_読み直した計画で出す: Story = {
  args: { ...CAPTIONS_PLAYING, plan: CAPTIONS_COMING },
  beforeEach: () => {
    captionsMade.plan = CAPTIONS_COMING
  },
  render: (args) => <SeatedWhileTheCaptionsAreMade {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await showing(canvasElement)
    await expect(canvas.queryByRole('button', { name: '字幕' })).toBeNull()

    theCaptionsAre(CAPTIONED)

    await waitFor(() =>
      expect(canvas.getByRole('button', { name: '字幕' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    )
    await captionSays(canvasElement, 'shown')
  },
}

interface CaptionsLaid {
  lit: number
}

const captionsLaid: CaptionsLaid[] = []

const OVER_A_PICTURE = { width: 1440, height: 1080 }

const capturingTheCaptions: TakeCapture = async ({ over }) => {
  const plate = document.createElement('canvas')

  plate.width = OVER_A_PICTURE.width
  plate.height = OVER_A_PICTURE.height

  const context = plate.getContext('2d') as CanvasRenderingContext2D

  over?.(context, OVER_A_PICTURE)

  const pixels = context.getImageData(0, 0, plate.width, plate.height).data
  let lit = 0

  for (let at = 3; at < pixels.length; at += 4) {
    if (pixels[at] > 0) {
      lit += 1
    }
  }

  captionsLaid.push({ lit })

  return 'saved'
}

export const キャプチャは画面のとおり字幕ごと: Story = {
  args: { ...CAPTIONS_PLAYING, takeCapture: capturingTheCaptions },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await captionSays(canvasElement, 'shown')

    captionsLaid.length = 0
    await userEvent.click(canvas.getByRole('button', { name: 'キャプチャ' }))
    await waitFor(() => expect(captionsLaid).toHaveLength(1))
    await expect(captionsLaid[0].lit).toBeGreaterThan(0)
  },
}

export const 字幕を消したキャプチャに字幕は入らない: Story = {
  args: { ...CAPTIONS_PLAYING, takeCapture: capturingTheCaptions },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await captionSays(canvasElement, 'shown')
    await userEvent.click(canvas.getByRole('button', { name: '字幕' }))
    await captionSays(canvasElement, 'off')

    captionsLaid.length = 0
    await userEvent.click(canvas.getByRole('button', { name: 'キャプチャ' }))
    await waitFor(() => expect(captionsLaid).toHaveLength(1))
    await expect(captionsLaid[0].lit).toBe(0)
  },
}

export const ピクチャーインピクチャーのあいだ字幕は描かない: Story = {
  args: CAPTIONS_PLAYING,
  play: async ({ canvasElement }) => {
    await captionSays(canvasElement, 'shown')

    try {
      pictureOut(canvasElement, true)
      await captionSays(canvasElement, 'off')

      pictureOut(canvasElement, false)
      await captionSays(canvasElement, 'shown')
    } finally {
      pictureBack()
    }
  },
}

export const 要素の全画面が無いときはページの中で窓いっぱいに: Story = {
  args: CAPTIONS_PLAYING,
  play: async ({ canvasElement }) => {
    await captionSays(canvasElement, 'shown')
    await fillsTheWindowWithoutElementFullscreen(
      canvasElement,
      'player',
      'player-captions',
      'missing',
    )
  },
}

export const 要素の全画面を断られたらページの中で窓いっぱいに: Story = {
  args: CAPTIONS_PLAYING,
  play: async ({ canvasElement }) => {
    await captionSays(canvasElement, 'shown')
    await fillsTheWindowWithoutElementFullscreen(
      canvasElement,
      'player',
      'player-captions',
      'refused',
    )
  },
}

const BROADCAST_THROUGHOUT = throughout(DATA_BROADCAST_CATALOG)

const broadcastAsked: string[] = []

function readingTheBroadcast(
  answer: DataBroadcastRead = { state: 'read', timeline: BROADCAST_THROUGHOUT },
): ReadDataBroadcast {
  return async (id, source) => {
    broadcastAsked.push(`${id}/${source ?? '—'}`)

    return answer
  }
}

const readingTheModules = readingModulesOf(dataBroadcastModules)

const BROADCAST_PLAYING = {
  detail: { ...detail('1266'), service: { networkId: 32736, serviceId: 1024 } },
  plan: HANDED_OVER,
  startAt: 0,
  pictureHref: () => DRAWN_PICTURE,
  readDataBroadcast: readingTheBroadcast(),
  readDataBroadcastModule: readingTheModules,
}

function pictureOf(canvasElement: HTMLElement): HTMLElement {
  const picture = canvasElement.querySelector('[data-slot="player-picture"]')

  if (!(picture instanceof HTMLElement)) {
    throw new Error('the picture is not on the screen')
  }

  return picture
}

export const データ放送のある録画は操作子を置く: Story = {
  args: BROADCAST_PLAYING,
  beforeEach: () => {
    broadcastAsked.length = 0
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const toggle = await canvas.findByRole(
      'button',
      { name: 'データ放送' },
      { timeout: 10000 },
    )

    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await expect(broadcastAsked[0]).toBe('1266/—')
    await expect(canvasElement.querySelector('iframe')).toBeNull()
    await expect(pictureOf(canvasElement)).not.toHaveAttribute('data-rect')

    const row = toggle.closest('div')

    await expect(
      within(row as HTMLElement)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual(expect.arrayContaining(['データ放送', '設定', '全画面']))
  },
}

export const データ放送を開くと面と帯が出て映像が縮む: Story = {
  parameters: { screen: { width: 1180, height: 820 } },
  args: BROADCAST_PLAYING,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const toggle = await canvas.findByRole(
      'button',
      { name: 'データ放送' },
      { timeout: 10000 },
    )

    await userEvent.click(toggle)

    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await waitFor(
      () =>
        expect(pictureOf(canvasElement)).toHaveAttribute(
          'data-rect',
          '560,60,360,203',
        ),
      { timeout: 5000 },
    )
    const band = canvas.getByRole('group', { name: 'データ放送のリモコン' })

    await expect(band).toBeVisible()
    await expect(band).toHaveAttribute('data-place', 'under')

    const chrome = canvasElement.querySelector(
      '[data-slot="player-chrome"]',
    ) as HTMLElement
    const row = chrome.getBoundingClientRect()
    const face = (
      canvasElement.querySelector('[data-slot="player-face"]') as HTMLElement
    ).getBoundingClientRect()

    await expect(chrome.contains(band)).toBe(false)
    await expect(Math.abs(row.top - face.bottom)).toBeLessThan(0.5)
    await expect(
      Math.abs(band.getBoundingClientRect().top - row.bottom),
    ).toBeLessThan(0.5)
    await expect(getComputedStyle(chrome).backgroundImage).toBe('none')
    await expect(canvasElement.querySelector('iframe')).not.toBeNull()

    await userEvent.click(toggle)

    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await waitFor(() =>
      expect(pictureOf(canvasElement)).not.toHaveAttribute('data-rect'),
    )
    await expect(canvasElement.querySelector('iframe')).toBeNull()
  },
}

export const 秒の途中から始まった録画でも入口の文書が番組と自分の場所を読んで面へ進む: Story =
  {
    args: {
      ...BROADCAST_PLAYING,
      detail: {
        ...BROADCAST_PLAYING.detail,
        startedAt: '2026-08-08T12:29:45.250+09:00',
      },
      readDataBroadcast: readingTheBroadcast({
        state: 'read',
        timeline: throughout(PROGRAMME_READING_CATALOG),
      }),
      readDataBroadcastModule: readingModulesOf(programmeReadingModules),
    },
    play: async ({ canvasElement }) => {
      const canvas = within(canvasElement)
      const toggle = await canvas.findByRole(
        'button',
        { name: 'データ放送' },
        { timeout: 10000 },
      )

      await userEvent.click(toggle)

      await waitFor(
        () =>
          expect(pictureOf(canvasElement)).toHaveAttribute(
            'data-rect',
            '80,120,400,225',
          ),
        { timeout: 5000 },
      )
    },
  }

export const 録画のデータ放送は番組の経過時間を再生した位置で答える: Story = {
  args: {
    ...BROADCAST_PLAYING,
    readDataBroadcast: readingTheBroadcast({
      state: 'read',
      timeline: throughout(PROGRAMME_READING_CATALOG),
    }),
    readDataBroadcastModule: readingModulesOf(relativeTimeModules),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const toggle = await canvas.findByRole(
      'button',
      { name: 'データ放送' },
      { timeout: 10000 },
    )

    await userEvent.click(toggle)

    await waitFor(
      () =>
        expect(pictureOf(canvasElement)).toHaveAttribute(
          'data-rect',
          '80,120,400,225',
        ),
      { timeout: 5000 },
    )
  },
}

export const データ放送を自動で開く: Story = {
  args: {
    ...BROADCAST_PLAYING,
    autoOpensDataBroadcast: true,
    readDataBroadcast: readingTheBroadcast({
      state: 'read',
      timeline: { ...BROADCAST_THROUGHOUT, autoStart: true },
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const toggle = await canvas.findByRole(
      'button',
      { name: 'データ放送' },
      { timeout: 10000 },
    )

    await waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'true'))
    await expect(canvasElement.querySelector('iframe')).not.toBeNull()
  },
}

export const データ放送の無い録画は操作子を置かない: Story = {
  args: {
    ...BROADCAST_PLAYING,
    readDataBroadcast: readingTheBroadcast({ state: 'none' }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await canvas.findByRole('button', { name: '設定' })
    await new Promise((resolve) => setTimeout(resolve, 600))
    await expect(
      canvas.queryByRole('button', { name: 'データ放送' }),
    ).toBeNull()
  },
}

export const データ放送の起動文書がまだ無い時刻では操作子を置かない: Story = {
  args: {
    ...BROADCAST_PLAYING,
    readDataBroadcast: readingTheBroadcast({
      state: 'read',
      timeline: {
        ...BROADCAST_THROUGHOUT,
        incomplete: true,
        carousels: BROADCAST_THROUGHOUT.carousels.map((carousel) => ({
          ...carousel,
          versions: carousel.versions.map((version) =>
            version.id === 0 ? { ...version, fromSec: 300 } : version,
          ),
        })),
      },
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await canvas.findByRole('button', { name: '設定' })
    await new Promise((resolve) => setTimeout(resolve, 600))
    await expect(
      canvas.queryByRole('button', { name: 'データ放送' }),
    ).toBeNull()
  },
}

function forgettingTheCaptionStyle() {
  const forget = () => {
    document.cookie = `${CAPTION_STYLE_COOKIE}=;path=/;max-age=0`
  }

  forget()

  return forget
}

function captionStyleKept(): string | undefined {
  return cookieIn(document.cookie, CAPTION_STYLE_COOKIE)
}

function readingOne(picture: CaptionPicture): ReadCaptions {
  return async () => ({
    state: 'read',
    window: {
      canvas: CAPTION_CANVAS_FIXTURE,
      untilSec: 600,
      cues: [{ atSec: 0, picture }],
    },
  })
}

function gripOf(canvasElement: HTMLElement): HTMLElement {
  const grip = canvasElement.querySelector('[data-slot="player-caption-grip"]')

  if (!(grip instanceof HTMLElement)) {
    throw new Error('nothing over the caption takes the pointer')
  }

  return grip
}

async function gripShown(canvasElement: HTMLElement) {
  await waitFor(
    () => expect(gripOf(canvasElement)).toHaveAttribute('data-shown', 'true'),
    { timeout: 10000 },
  )

  return gripOf(canvasElement)
}

function middleOf(element: HTMLElement) {
  const box = element.getBoundingClientRect()

  return {
    clientX: box.left + box.width / 2,
    clientY: box.top + box.height / 2,
  }
}

async function dragged(
  grip: HTMLElement,
  across: number,
  down: number,
  pointer: 'mouse' | 'touch' = 'mouse',
) {
  const from = middleOf(grip)
  const to = { clientX: from.clientX + across, clientY: from.clientY + down }
  const [hold, letGo] =
    pointer === 'touch'
      ? ['[TouchA>]', '[/TouchA]']
      : ['[MouseLeft>]', '[/MouseLeft]']
  const pointerName = pointer === 'touch' ? 'TouchA' : 'mouse'
  const user = userEvent.setup()

  await user.pointer([
    { keys: hold, target: grip, coords: from },
    {
      pointerName,
      target: grip,
      coords: {
        clientX: from.clientX + across / 2,
        clientY: from.clientY + down / 2,
      },
    },
    { pointerName, target: grip, coords: to },
  ])
  await expect(grip).toHaveAttribute('data-holding', 'true')
  await user.pointer({ keys: letGo, target: grip, coords: to })
}

async function toTheCaptionFace(canvasElement: HTMLElement) {
  await userEvent.click(
    within(canvasElement).getByRole('button', { name: '設定' }),
  )
  await userEvent.click(
    await screen.findByRole('button', { name: '字幕を変更' }),
  )

  return screen.findByRole('group', { name: '背景' })
}

function choose(group: string, name: string) {
  return userEvent.click(
    within(screen.getByRole('group', { name: group })).getByRole('button', {
      name,
    }),
  )
}

async function looks(canvasElement: HTMLElement, look: string) {
  await waitFor(
    () =>
      expect(captionLayer(canvasElement)).toHaveAttribute('data-look', look),
    { timeout: 10000 },
  )
}

const STYLED_CAPTIONS = {
  ...CAPTIONS_PLAYING,
  readCaptions: readingOne(CAPTION_PICTURE_FIXTURE),
}

const HIGH_IN_THE_PICTURE: CaptionPicture = {
  ...CAPTION_PICTURE_FIXTURE,
  top: 60,
}

export const 字幕の見た目は既定なら放送の絵のまま: Story = {
  args: { ...CAPTIONS_PLAYING, readCaptions: readingOne(HIGH_IN_THE_PICTURE) },
  beforeEach: forgettingTheCaptionStyle,
  play: async ({ canvasElement }) => {
    await captionSays(canvasElement, 'shown')
    await looks(canvasElement, 'as-broadcast')

    const layer = captionLayer(canvasElement) as HTMLCanvasElement
    const video = canvasElement.querySelector('video') as HTMLVideoElement
    const box = { width: layer.clientWidth, height: layer.clientHeight }
    const shown =
      video.videoWidth > 0
        ? containedIn(box, {
            width: video.videoWidth,
            height: video.videoHeight,
          })
        : { left: 0, top: 0, ...box }
    const place = placedOn(shown, CAPTION_CANVAS_FIXTURE, HIGH_IN_THE_PICTURE)
    const ratio = window.devicePixelRatio || 1
    const expected = document.createElement('canvas')

    expected.width = layer.width
    expected.height = layer.height

    const bitmap = await createImageBitmap(
      new Blob([CAPTION_PICTURE_FIXTURE.png.slice()], { type: 'image/png' }),
    )

    expected
      .getContext('2d')
      ?.drawImage(
        bitmap,
        place.left * ratio,
        place.top * ratio,
        place.width * ratio,
        place.height * ratio,
      )

    const read = (on: HTMLCanvasElement) =>
      on.getContext('2d')?.getImageData(0, 0, on.width, on.height).data

    const drawn = read(layer)
    const wanted = read(expected)
    let apart = 0

    for (let at = 0; drawn && wanted && at < drawn.length; at += 1) {
      apart += drawn[at] === wanted[at] ? 0 : 1
    }

    await expect(drawn?.length).toBe(wanted?.length)
    await expect(apart).toBe(0)
  },
}

export const 歯車の字幕の面で見た目を変える: Story = {
  args: STYLED_CAPTIONS,
  beforeEach: forgettingTheCaptionStyle,
  play: async ({ canvasElement }) => {
    await captionSays(canvasElement, 'shown')
    await gripShown(canvasElement)
    await toTheCaptionFace(canvasElement)
    await new Promise((rest) => setTimeout(rest, 400))

    const before = gripOf(canvasElement).getBoundingClientRect()

    await expect(screen.getByRole('button', { name: '戻る' })).toHaveFocus()
    await expect(
      screen.getByRole('button', { name: '位置を戻す' }),
    ).toBeDisabled()
    await expect(
      screen.getByRole('button', { name: '元に戻す' }),
    ).toBeDisabled()
    await expect(
      screen.getByRole('button', { name: '全部同じ色' }),
    ).toBeDisabled()

    await choose('背景', 'なし')
    await looks(canvasElement, 'restyled')
    await expect(captionStyleKept()).toBe('bn')

    await choose('大きさ', '150%')
    await waitFor(() =>
      expect(
        gripOf(canvasElement).getBoundingClientRect().height,
      ).toBeGreaterThan(before.height * 1.3),
    )
    await expect(
      Math.abs(
        gripOf(canvasElement).getBoundingClientRect().bottom - before.bottom,
      ),
    ).toBeLessThan(1.5)

    await choose('文字色', '黄')
    await expect(
      screen.getByRole('button', { name: '全部同じ色' }),
    ).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: '全部同じ色' }))
    await choose('縁取り', '足す')
    await expect(captionStyleKept()).toBe('bn.s150.cy.a1.ea')

    await userEvent.click(screen.getByRole('button', { name: '元に戻す' }))
    await looks(canvasElement, 'as-broadcast')
    await expect(captionStyleKept()).toBeUndefined()

    await userEvent.click(screen.getByRole('button', { name: '戻る' }))
    await expect(
      await screen.findByRole('button', { name: '字幕を変更' }),
    ).toHaveFocus()
  },
}

export const 字幕の無い録画の歯車に字幕の行は無い: Story = {
  args: { ...CAPTIONS_PLAYING, plan: ON_THE_FLY },
  play: async ({ canvasElement }) => {
    await showing(canvasElement)
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: '設定' }),
    )
    await screen.findByRole('group', { name: '画質' })
    await expect(
      screen.queryByRole('button', { name: '字幕を変更' }),
    ).toBeNull()
    await expect(
      canvasElement.querySelector('[data-slot="player-caption-grip"]'),
    ).toBeNull()
  },
}

export const 読み込み直しても字幕の見た目は残る: Story = {
  args: STYLED_CAPTIONS,
  beforeEach: () => {
    const forget = forgettingTheCaptionStyle()

    document.cookie = `${CAPTION_STYLE_COOKIE}=bs.s125;path=/`

    return forget
  },
  play: async ({ canvasElement }) => {
    await captionSays(canvasElement, 'shown')
    await looks(canvasElement, 'restyled')
    await toTheCaptionFace(canvasElement)
    await expect(
      within(screen.getByRole('group', { name: '背景' })).getByRole('button', {
        name: '不透明',
      }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(
      within(screen.getByRole('group', { name: '大きさ' })).getByRole(
        'button',
        {
          name: '125%',
        },
      ),
    ).toHaveAttribute('aria-pressed', 'true')
  },
}

export const 字幕をつまんで動かす: Story = {
  args: STYLED_CAPTIONS,
  beforeEach: forgettingTheCaptionStyle,
  play: async ({ canvasElement }) => {
    await captionSays(canvasElement, 'shown')

    const grip = await gripShown(canvasElement)
    const before = grip.getBoundingClientRect()

    await dragged(grip, -60, -40)
    await expect(grip).not.toHaveAttribute('data-holding')
    await waitFor(() =>
      expect(grip.getBoundingClientRect().left).toBeLessThan(before.left - 50),
    )
    await expect(captionStyleKept()).toMatch(/^x-\d+\.y-\d+$/)

    await new Promise((rest) => setTimeout(rest, 400))
    await expect(bezelOn(canvasElement)).toBeNull()

    await toTheCaptionFace(canvasElement)
    await userEvent.click(screen.getByRole('button', { name: '位置を戻す' }))
    await expect(captionStyleKept()).toBeUndefined()
    await expect(
      screen.getByRole('button', { name: '位置を戻す' }),
    ).toBeDisabled()
  },
}

export const 字幕は映像の枠の外へは動かない: Story = {
  args: STYLED_CAPTIONS,
  beforeEach: forgettingTheCaptionStyle,
  play: async ({ canvasElement }) => {
    await captionSays(canvasElement, 'shown')

    const grip = await gripShown(canvasElement)
    const face = captionLayer(canvasElement).getBoundingClientRect()

    await dragged(grip, 4000, 4000)
    await waitFor(() =>
      expect(
        Math.abs(grip.getBoundingClientRect().right - face.right),
      ).toBeLessThan(1.5),
    )
    await expect(grip.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      face.bottom + 1,
    )
  },
}

export const 指でも字幕をつまんで動かせる: Story = {
  args: STYLED_CAPTIONS,
  parameters: { coarse: true },
  beforeEach: forgettingTheCaptionStyle,
  play: async ({ canvasElement }) => {
    await captionSays(canvasElement, 'shown')

    const grip = await gripShown(canvasElement)

    await expect(getComputedStyle(grip).touchAction).toBe('none')
    await dragged(grip, 0, -50, 'touch')
    await expect(captionStyleKept()).toMatch(/^y-\d+$/)
  },
}

export const 字幕を動かさずに離すとプレイヤーの押下になる: Story = {
  args: STYLED_CAPTIONS,
  beforeEach: forgettingTheCaptionStyle,
  play: async ({ canvasElement }) => {
    await captionSays(canvasElement, 'shown')

    const grip = await gripShown(canvasElement)
    const from = middleOf(grip)

    await userEvent.setup().pointer([
      { keys: '[MouseLeft>]', target: grip, coords: from },
      {
        target: grip,
        coords: { clientX: from.clientX + 3, clientY: from.clientY },
      },
      { keys: '[/MouseLeft]', target: grip, coords: from },
    ])
    await waitFor(() => expect(bezelOn(canvasElement)).not.toBeNull())
    await expect(grip).not.toHaveAttribute('data-holding')
    await expect(captionStyleKept()).toBeUndefined()
  },
}

export const 字幕の外を押しても字幕は動かない: Story = {
  args: STYLED_CAPTIONS,
  beforeEach: forgettingTheCaptionStyle,
  play: async ({ canvasElement }) => {
    await captionSays(canvasElement, 'shown')

    const grip = await gripShown(canvasElement)
    const before = grip.getBoundingClientRect()
    const area = pressArea(canvasElement)
    const box = area.getBoundingClientRect()
    const away = { clientX: box.left + box.width / 2, clientY: box.top + 24 }

    await userEvent.setup().pointer([
      { keys: '[MouseLeft>]', target: area, coords: away },
      {
        target: area,
        coords: { clientX: away.clientX - 80, clientY: away.clientY + 60 },
      },
      { keys: '[/MouseLeft]', target: area, coords: away },
    ])
    await expect(captionStyleKept()).toBeUndefined()
    await expect(grip.getBoundingClientRect().left).toBe(before.left)
  },
}

function seekTopOf(canvasElement: HTMLElement): number {
  const controls = canvasElement.querySelector(
    '[data-slot="player-controls"]',
  ) as HTMLElement

  return (
    controls.getBoundingClientRect().top +
    parseFloat(getComputedStyle(controls).paddingTop)
  )
}

export const 操作列が出ているあいだ下の字幕は操作列の上へ逃げる: Story = {
  args: { ...STYLED_CAPTIONS, holdsAtOnce: true },
  beforeEach: forgettingTheCaptionStyle,
  play: async ({ canvasElement }) => {
    await captionSays(canvasElement, 'shown')

    const grip = await gripShown(canvasElement)

    await expect(board(canvasElement)).toHaveAttribute('data-up', 'true')
    await waitFor(() =>
      expect(grip.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        seekTopOf(canvasElement) - 5,
      ),
    )
  },
}

export const 動きを止めていると字幕は操作列の上へ置き換わる: Story = {
  args: { ...STYLED_CAPTIONS, holdsAtOnce: true },
  parameters: { lessMotion: true },
  beforeEach: forgettingTheCaptionStyle,
  play: async ({ canvasElement }) => {
    await captionSays(canvasElement, 'shown')

    const grip = await gripShown(canvasElement)

    await expect(grip.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      seekTopOf(canvasElement) - 5,
    )
  },
}

export const 狭い窓でも歯車の字幕の面は崩れない: Story = {
  args: STYLED_CAPTIONS,
  parameters: { screen: { width: 375, height: 740 } },
  beforeEach: forgettingTheCaptionStyle,
  play: async ({ canvasElement }) => {
    await captionSays(canvasElement, 'shown')

    const face = await toTheCaptionFace(canvasElement)
    const panel = face.closest('[data-slot="caption-style"]') as HTMLElement
    const box = panel.getBoundingClientRect()

    await expect(box.left).toBeGreaterThanOrEqual(0)
    await expect(box.right).toBeLessThanOrEqual(375)

    for (const group of panel.querySelectorAll('[role="group"]')) {
      const each = group.getBoundingClientRect()

      await expect(each.right).toBeLessThanOrEqual(box.right + 0.5)
    }

    await userEvent.click(
      within(canvasElement).getByRole('button', { name: '設定' }),
    )
    await waitFor(() => expect(panel).not.toBeInTheDocument())
  },
}

function alphaAt(
  canvasElement: HTMLElement,
  picture: CaptionPicture,
  x: number,
  y: number,
): number {
  const layer = captionLayer(canvasElement) as HTMLCanvasElement
  const video = canvasElement.querySelector('video') as HTMLVideoElement
  const box = { width: layer.clientWidth, height: layer.clientHeight }
  const shown =
    video.videoWidth > 0
      ? containedIn(box, { width: video.videoWidth, height: video.videoHeight })
      : { left: 0, top: 0, ...box }
  const place = placedOn(shown, CAPTION_CANVAS_FIXTURE, picture)
  const ratio = window.devicePixelRatio || 1
  const at = {
    x: Math.round((place.left + (x / picture.width) * place.width) * ratio),
    y: Math.round((place.top + (y / picture.height) * place.height) * ratio),
  }

  return layer.getContext('2d')?.getImageData(at.x, at.y, 1, 1).data[3] ?? -1
}

function keepingTheCaptionStyle(said: string) {
  return () => {
    const forget = forgettingTheCaptionStyle()

    document.cookie = `${CAPTION_STYLE_COOKIE}=${said};path=/`

    return forget
  }
}

const NO_BAND = { ...whiteWithNoBand(), top: 100 }

const SOLID_BAND = whiteOnASolidBand()

export const 帯の無い字幕には行ごとに帯を敷く: Story = {
  args: { ...CAPTIONS_PLAYING, readCaptions: readingOne(NO_BAND) },
  beforeEach: keepingTheCaptionStyle('bh'),
  play: async ({ canvasElement }) => {
    await captionSays(canvasElement, 'shown')
    await looks(canvasElement, 'restyled')
    await waitFor(() =>
      expect(alphaAt(canvasElement, NO_BAND, 66, 34)).toBeGreaterThan(100),
    )
    await expect(alphaAt(canvasElement, NO_BAND, 66, 34)).toBeLessThan(160)
    await expect(alphaAt(canvasElement, NO_BAND, 480, 114)).toBe(0)
  },
}

export const 不透明の帯の放送も背景なしで帯が消える: Story = {
  args: { ...CAPTIONS_PLAYING, readCaptions: readingOne(SOLID_BAND) },
  beforeEach: keepingTheCaptionStyle('bn'),
  play: async ({ canvasElement }) => {
    await captionSays(canvasElement, 'shown')
    await looks(canvasElement, 'restyled')
    await waitFor(() =>
      expect(alphaAt(canvasElement, SOLID_BAND, 8, 8)).toBe(0),
    )
    await expect(alphaAt(canvasElement, SOLID_BAND, 34, 46)).toBeGreaterThan(
      200,
    )
  },
}
