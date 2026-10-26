import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test'

import type { PlaybackPlan, PlaybackRead } from '@/repository/videos'
import type {
  RecordingDiscarded,
  ThumbnailWrite,
} from '@/repository/recordings'
import type { TicketWrite } from '@/repository/tickets'
import type { EncodeWrite } from '@/repository/encode'
import { ENCODE_CHOICES } from '@/repository/encode.fixtures'
import { RecordingDetailView } from '@/components/recordings/recording-detail-page'
import { skipNoted } from '@/stories/noted-skips'
import { seekNoted } from '@/stories/noted-seeks'
import type { FeedRecording } from '@/components/recordings/recording-feed'
import {
  BAND_UNDER_THE_BOX,
  DATA_BROADCAST_NAME,
} from '@/components/data-broadcast/data-broadcast-player'
import { RECORDING_DETAIL_FIXTURES } from '@/stories/fixtures/recording-details'
import { DRAWN_PICTURE, drawnFrame } from '@/stories/fixtures/frames'
import {
  DATA_BROADCAST_CATALOG,
  LOCKING_CATALOG,
  SOUNDING_CATALOG,
  dataBroadcastModules,
  lockingModules,
  soundingModules,
} from '@/stories/fixtures/data-broadcast'
import {
  readingModulesOf,
  throughout,
} from '@/stories/fixtures/recording-data-broadcast'
import { afterTheArrival } from '@/stories/after-the-arrival'
import { slidOutWhole } from '@/stories/slid-out-whole'
import { REMOTE_KEYS, compact } from '@/stories/remote-in-the-column'
import { inTheApp } from '@/stories/frames'
import { hearingTheSounds, type HeardSound } from '@/stories/heard-sounds'
import { romSoundGain } from '@/lib/data-broadcast-sound'
import { DATA_BROADCAST_SOUNDS, forgettingCookie } from '@/lib/stored-flag'

function detail(id: string) {
  const found = RECORDING_DETAIL_FIXTURES.find((r) => r.id === id)

  if (!found) {
    throw new Error(`fixture ${id} not found`)
  }

  return found
}

const HANDED_OVER: PlaybackPlan = {
  standing: 'whole',
  route: 'direct',
  seeking: 'byRange',
  canSeek: true,
  transcodes: false,
  showsAsAWholeRecording: true,
  mediaType: 'video/mp4',
  sounds: ['main'],
  chapters: [],
  captions: 'none',
  bytes: 3_490_550_128,
}

const PLANNED: PlaybackRead = { state: 'planned', plan: HANDED_OVER }

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

const meta = {
  title: 'Screens/録画詳細/データ放送',
  component: RecordingDetailView,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/recordings/1266' },
    },
    layout: 'fullscreen',
  },
  args: {
    detail: {
      ...detail('1266'),
      service: { networkId: 32736, serviceId: 1024 },
    },
    playback: PLANNED,
    startAt: 0,
    onRemakeThumbnail: remade,
    onDelete: deleted,
    onTakeTicket: ticketed,
    onAskForTheSound: async () => PLANNED,
    onKeepPosition: async () => ({ state: 'ok' as const }),
    onQueueEncode: done,
    onCallOffEncode: done,
    encodeChoices: ENCODE_CHOICES,
    onNoteSkip: skipNoted,
    onNoteSeek: seekNoted,
    pictureHref: () => DRAWN_PICTURE,
    frameHref: drawnFrame,
    feedRecording: handedAsItIs,
    readDataBroadcast: async () => ({
      state: 'read',
      timeline: throughout(DATA_BROADCAST_CATALOG),
    }),
    readDataBroadcastModule: readingModulesOf(dataBroadcastModules),
  },
  decorators: [inTheApp],
} satisfies Meta<typeof RecordingDetailView>

export default meta
type Story = StoryObj<typeof meta>

function onTheScreen(canvasElement: HTMLElement, slot: string): HTMLElement {
  const found = canvasElement.querySelector(`[data-slot="${slot}"]`)

  if (!(found instanceof HTMLElement)) {
    throw new Error(`${slot} is not on the screen`)
  }

  return found
}

/** The player, where the control bar's `データ放送` is; the remote in the column has a key of the same name. */
function inThePlayer(canvasElement: HTMLElement) {
  return within(onTheScreen(canvasElement, 'player'))
}

function press(on: HTMLElement, key: string) {
  on.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

async function near(got: number, want: number) {
  await expect(Math.abs(got - want)).toBeLessThan(0.6)
}

const AT_THE_START = '560,60,360,203'

const ON_THE_WEATHER = '40,60,360,203'

/** A length the page sets in rem, in pixels at the root's font size, which grows with the window. */
function rem(px: number): number {
  return (
    (px * parseFloat(getComputedStyle(document.documentElement).fontSize)) / 16
  )
}

/** The gap between the player's box and the column, as the live page parts them. */
const GAP = 26

/** The column's width when it is folded to its rail, and when it holds the remote. */
const RAIL = 44

const COLUMN = 344

async function shrunkTo(canvasElement: HTMLElement, rect?: string) {
  const picture = onTheScreen(canvasElement, 'player-picture')

  await waitFor(
    () =>
      rect
        ? expect(picture).toHaveAttribute('data-rect', rect)
        : expect(picture).not.toHaveAttribute('data-rect'),
    { timeout: 5000 },
  )
}

function theColumn(canvasElement: HTMLElement): HTMLElement | null {
  const found = canvasElement.querySelector('aside[aria-label="リモコン"]')

  return found instanceof HTMLElement ? found : null
}

function columnOn(canvasElement: HTMLElement): HTMLElement {
  const found = theColumn(canvasElement)

  if (found === null) {
    throw new Error('the column is not on the screen')
  }

  return found
}

/** Waits for the column to come to rest after it arrived or folded. */
async function columnAtRest(canvasElement: HTMLElement) {
  const column = columnOn(canvasElement)

  await waitFor(
    () => expect(column.getAnimations({ subtree: true }).length).toBe(0),
    { timeout: 6000 },
  )
}

/** What the column's arrival and fold play: the column's own width and gap, and the remote's slide, leaving out a key's own press. */
function foldMoves(column: HTMLElement): CSSTransition[] {
  return column
    .getAnimations({ subtree: true })
    .filter((one): one is CSSTransition => one instanceof CSSTransition)
    .filter((one) => {
      const target = (one.effect as KeyframeEffect).target

      return (
        target === column ||
        (target instanceof HTMLElement && target.dataset.slot === 'remote-slot')
      )
    })
}

/** Waits for the remote to have left the column, once a fold has settled. */
async function remoteGone(canvasElement: HTMLElement) {
  await waitFor(
    () =>
      expect(
        within(canvasElement).queryByRole('group', {
          name: 'データ放送のリモコン',
        }),
      ).toBeNull(),
    { timeout: 6000 },
  )
}

function faceWidth(canvasElement: HTMLElement): number {
  return onTheScreen(canvasElement, 'player-face').getBoundingClientRect().width
}

/** The programme's information under the player: the title, the line under it and the rest, in the page's column. */
function infoWidth(canvasElement: HTMLElement): number {
  const meta = onTheScreen(canvasElement, 'watch-meta')

  return (meta.parentElement as HTMLElement).getBoundingClientRect().width
}

/** Where the page lays its content out: inside the main area's gutters. */
function thePage(canvasElement: HTMLElement): { left: number; right: number } {
  const main = onTheScreen(canvasElement, 'screen-main')
  const { left, right } = main.getBoundingClientRect()
  const style = getComputedStyle(main)

  return {
    left: left + parseFloat(style.paddingLeft),
    right: right - parseFloat(style.paddingRight),
  }
}

async function within1(got: number, want: number) {
  await expect(Math.abs(got - want)).toBeLessThanOrEqual(1)
}

/** One column for the page while the remote stands beside the box: the link back, the box and the programme's information start at the same left edge, the information runs to the right edge of the column beside the box, and the whole is centred in the page. */
async function oneColumn(canvasElement: HTMLElement) {
  const link = within(canvasElement)
    .getByRole('link', { name: 'ライブラリへ' })
    .getBoundingClientRect()
  const box = onTheScreen(canvasElement, 'player').getBoundingClientRect()
  const info = (
    onTheScreen(canvasElement, 'watch-meta').parentElement as HTMLElement
  ).getBoundingClientRect()
  const side = columnOn(canvasElement).getBoundingClientRect()
  const page = thePage(canvasElement)

  await within1(link.left, box.left)
  await within1(info.left, box.left)
  await within1(info.right, side.right)
  await near(side.left - box.right, rem(GAP))
  await within1(box.left - page.left, page.right - side.right)
}

async function closedFaceWidth(canvasElement: HTMLElement): Promise<number> {
  await inThePlayer(canvasElement).findByRole(
    'button',
    { name: 'データ放送' },
    { timeout: 10000 },
  )
  await afterTheArrival(canvasElement)

  return faceWidth(canvasElement)
}

async function opened(canvasElement: HTMLElement) {
  const toggle = await inThePlayer(canvasElement).findByRole(
    'button',
    { name: 'データ放送' },
    { timeout: 10000 },
  )

  await afterTheArrival(canvasElement)
  await userEvent.click(toggle)
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await shrunkTo(canvasElement, AT_THE_START)

  return toggle
}

/** The control row right under the box on its own opaque ground with no scrim, and the programme below it. */
async function rowUnderTheBox(canvasElement: HTMLElement) {
  const face = onTheScreen(canvasElement, 'player-face').getBoundingClientRect()
  const chrome = onTheScreen(canvasElement, 'player-chrome')
  const row = chrome.getBoundingClientRect()
  const shell = onTheScreen(canvasElement, 'player').getBoundingClientRect()

  await near(row.top, face.bottom)
  await expect(row.width).toBe(face.width)
  await expect(getComputedStyle(chrome).backgroundImage).toBe('none')
  await expect(getComputedStyle(chrome).backgroundColor).not.toBe(
    'rgba(0, 0, 0, 0)',
  )
  await expect(
    canvasElement.querySelector('[data-slot="data-broadcast-scrim"]'),
  ).toBeNull()
  await expect(
    onTheScreen(canvasElement, 'watch-meta').getBoundingClientRect().top,
  ).toBeGreaterThanOrEqual(shell.bottom)
}

/** The remote in the column beside the player: the fold alone at the column's head, the card 14 under it, its right edge at the page's, no band anywhere, the box narrowed to leave the column and the gap, and the control row under the box. */
async function inTheColumn(canvasElement: HTMLElement, closedWidth: number) {
  const remote = await within(
    await waitFor(() => columnOn(canvasElement)),
  ).findByRole('group', { name: 'データ放送のリモコン' }, { timeout: 6000 })
  const column = columnOn(canvasElement)

  await columnAtRest(canvasElement)
  await compact(remote)

  const face = onTheScreen(canvasElement, 'player-face').getBoundingClientRect()
  const shell = onTheScreen(canvasElement, 'player').getBoundingClientRect()
  const card = remote.getBoundingClientRect()
  const side = column.getBoundingClientRect()

  await expect(remote).toHaveAttribute('data-slot', 'data-broadcast-remote')
  await expect(
    within(column).getByRole('button', { name: 'リモコン' }),
  ).toHaveAttribute('aria-expanded', 'true')
  await expect(
    within(column).queryByRole('group', { name: 'リモコンとチャンネル' }),
  ).toBeNull()
  await expect(
    within(column)
      .getAllByRole('button')
      .filter((button) => !remote.contains(button)),
  ).toHaveLength(1)
  await near(side.width, rem(COLUMN))
  await near(card.right, side.right)
  await oneColumn(canvasElement)
  await near(side.left - shell.right, rem(GAP))
  await near(side.top, shell.top)
  await expect(face.width).toBeLessThan(closedWidth)
  await expect(
    canvasElement.querySelector('[data-slot="data-broadcast-band"]'),
  ).toBeNull()
  await expect(
    remote.querySelector('[data-slot="station-line"]'),
  ).toHaveTextContent('みなと総合1データ放送')
  await expect(
    within(remote)
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label') ?? button.textContent),
  ).toEqual(REMOTE_KEYS)
  await rowUnderTheBox(canvasElement)

  return remote
}

export const 開くと右の列にリモコンが出る: Story = {
  parameters: { screen: { width: 1600, height: 1000 } },
  play: async ({ canvasElement }) => {
    const closed = await closedFaceWidth(canvasElement)
    const info = infoWidth(canvasElement)

    await expect(theColumn(canvasElement)).toBeNull()

    const toggle = await opened(canvasElement)
    const remote = await inTheColumn(canvasElement, closed)
    const player = onTheScreen(canvasElement, 'player')

    await within1(
      player.getBoundingClientRect().left,
      thePage(canvasElement).left,
    )
    await expect(infoWidth(canvasElement)).toBeGreaterThan(
      faceWidth(canvasElement),
    )

    await userEvent.click(within(remote).getByRole('button', { name: '下' }))
    await userEvent.click(within(remote).getByRole('button', { name: '決定' }))
    await shrunkTo(canvasElement, ON_THE_WEATHER)
    await expect(document.activeElement).toBe(player)

    await userEvent.click(
      within(remote).getByRole('button', { name: DATA_BROADCAST_NAME }),
    )
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await shrunkTo(canvasElement)
    await expect(theColumn(canvasElement)).toBeNull()
    await remoteGone(canvasElement)
    await near(faceWidth(canvasElement), closed)
    await near(infoWidth(canvasElement), info)
  },
}

export const 開くと列が伸びてリモコンが右から入る: Story = {
  parameters: { screen: { width: 1600, height: 1000 } },
  play: async ({ canvasElement }) => {
    const toggle = await inThePlayer(canvasElement).findByRole(
      'button',
      { name: 'データ放送' },
      { timeout: 10000 },
    )

    await afterTheArrival(canvasElement)
    await userEvent.click(toggle)

    const column = await waitFor(() => columnOn(canvasElement))
    const running = foldMoves(column)
    const moving = Object.fromEntries(
      running.map((one) => [one.transitionProperty, one]),
    )

    await expect(Object.keys(moving).sort()).toEqual([
      'margin-left',
      'translate',
      'width',
    ])
    for (const one of running) {
      await expect(one.effect?.getComputedTiming().duration).toBe(300)
    }
    await expect(moving.width.effect?.getComputedTiming().delay).toBe(0)
    await expect(moving.translate.effect?.getComputedTiming().delay).toBe(22)

    await columnAtRest(canvasElement)
    await near(column.getBoundingClientRect().width, rem(COLUMN))
  },
}

export const 畳むと細い列になりもう一度押すとリモコンが戻る: Story = {
  parameters: { screen: { width: 1600, height: 1000 } },
  play: async ({ canvasElement }) => {
    const closed = await closedFaceWidth(canvasElement)
    const toggle = await opened(canvasElement)

    await inTheColumn(canvasElement, closed)

    const open = faceWidth(canvasElement)
    const column = columnOn(canvasElement)
    const fold = within(column).getByRole('button', { name: 'リモコン' })
    const player = onTheScreen(canvasElement, 'player')

    await userEvent.click(fold)
    await slidOutWhole(column)
    await columnAtRest(canvasElement)

    await expect(fold).toHaveAttribute('aria-expanded', 'false')
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await remoteGone(canvasElement)
    await near(column.getBoundingClientRect().width, rem(RAIL))
    await oneColumn(canvasElement)
    await expect(faceWidth(canvasElement)).toBeGreaterThan(open)
    await expect(
      canvasElement.querySelector('[data-slot="data-broadcast-band"]'),
    ).toBeNull()
    await rowUnderTheBox(canvasElement)

    player.focus()
    press(player, 'ArrowDown')
    press(player, 'Enter')
    await shrunkTo(canvasElement, ON_THE_WEATHER)

    await userEvent.click(fold)
    await inTheColumn(canvasElement, closed)
    await near(faceWidth(canvasElement), open)
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  },
}

export const 畳んだまま閉じて開くとリモコンから始まる: Story = {
  parameters: { screen: { width: 1600, height: 1000 } },
  play: async ({ canvasElement }) => {
    const closed = await closedFaceWidth(canvasElement)
    const toggle = await opened(canvasElement)

    await inTheColumn(canvasElement, closed)
    await userEvent.click(
      within(columnOn(canvasElement)).getByRole('button', { name: 'リモコン' }),
    )
    await columnAtRest(canvasElement)
    await remoteGone(canvasElement)

    await userEvent.click(toggle)
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await expect(theColumn(canvasElement)).toBeNull()
    await near(faceWidth(canvasElement), closed)

    await userEvent.click(toggle)
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await inTheColumn(canvasElement, closed)
  },
}

export const 背の高い窓でも板は伸ばさない: Story = {
  parameters: { screen: { width: 1600, height: 1400 } },
  play: async ({ canvasElement }) => {
    const closed = await closedFaceWidth(canvasElement)

    await opened(canvasElement)
    await inTheColumn(canvasElement, closed)
  },
}

export const ノートの窓では一段小さい板が送らずに収まる: Story = {
  parameters: { screen: { width: 1280, height: 800 } },
  play: async ({ canvasElement }) => {
    const closed = await closedFaceWidth(canvasElement)

    await opened(canvasElement)

    const remote = await inTheColumn(canvasElement, closed)
    const disc = within(remote)
      .getByRole('group', { name: '十字' })
      .getBoundingClientRect()
    const slot = remote.parentElement?.parentElement as HTMLElement

    await expect(remote.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      window.innerHeight,
    )
    await expect(slot.scrollHeight).toBe(slot.clientHeight)
    await near(disc.width, 152)

    for (const button of within(remote).getAllByRole('button')) {
      const { width, height } = button.getBoundingClientRect()

      await expect(Math.min(width, height)).toBeGreaterThanOrEqual(44)
    }
  },
}

export const 幅が1180px以下の窓では箱の下の帯: Story = {
  parameters: { screen: { width: 1180, height: 820 } },
  play: async ({ canvasElement }) => {
    await opened(canvasElement)

    const band = within(canvasElement).getByRole('group', {
      name: 'データ放送のリモコン',
    })
    const chrome = onTheScreen(canvasElement, 'player-chrome')

    await expect(band).toHaveAttribute('data-place', 'under')
    await expect(band).toHaveAttribute('data-slot', 'data-broadcast-band')
    await expect(theColumn(canvasElement)).toBeNull()
    await near(
      band.getBoundingClientRect().top,
      chrome.getBoundingClientRect().bottom,
    )
    await expect(band.getBoundingClientRect().width).toBe(
      chrome.getBoundingClientRect().width,
    )
    await expect(band.getBoundingClientRect().height).toBeGreaterThanOrEqual(
      BAND_UNDER_THE_BOX,
    )
    await rowUnderTheBox(canvasElement)
  },
}

export const 全画面では帯を映像に重ねる: Story = {
  parameters: { screen: { width: 1600, height: 1000 } },
  play: async ({ canvasElement }) => {
    const board = onTheScreen(canvasElement, 'player')

    Object.defineProperty(board, 'requestFullscreen', {
      value: undefined,
      configurable: true,
    })

    await opened(canvasElement)
    await userEvent.click(
      inThePlayer(canvasElement).getByRole('button', { name: '全画面' }),
    )
    await waitFor(() => expect(board).toHaveAttribute('data-fill', 'true'))

    const band = await within(board).findByRole('group', {
      name: 'データ放送のリモコン',
    })

    await expect(band).toHaveAttribute('data-place', 'over')
    await expect(
      canvasElement.querySelector('[data-slot="data-broadcast-remote"]'),
    ).toBeNull()
    await expect(band.getBoundingClientRect().width).toBe(window.innerWidth)
  },
}

export const 動きを減らす設定では一息に替える: Story = {
  parameters: { screen: { width: 1600, height: 1000 }, lessMotion: true },
  play: async ({ canvasElement }) => {
    const closed = await closedFaceWidth(canvasElement)

    await opened(canvasElement)

    const column = columnOn(canvasElement)

    await expect(foldMoves(column)).toHaveLength(0)
    await inTheColumn(canvasElement, closed)

    const fold = within(column).getByRole('button', { name: 'リモコン' })

    await userEvent.click(fold)
    await expect(foldMoves(column)).toHaveLength(0)
    await expect(fold).toHaveAttribute('aria-expanded', 'false')
    await expect(
      within(canvasElement).queryByRole('group', {
        name: 'データ放送のリモコン',
      }),
    ).toBeNull()
    await near(column.getBoundingClientRect().width, rem(RAIL))
  },
}

export const 背の低い窓で畳んでも番組の情報は動かない: Story = {
  parameters: { screen: { width: 1280, height: 800 } },
  play: async ({ canvasElement }) => {
    const closed = await closedFaceWidth(canvasElement)

    await opened(canvasElement)
    await inTheColumn(canvasElement, closed)

    const column = columnOn(canvasElement)
    const fold = within(column).getByRole('button', { name: 'リモコン' })
    const meta = onTheScreen(canvasElement, 'watch-meta')
    const top = meta.getBoundingClientRect().top

    await expect(column.getBoundingClientRect().bottom).toBeGreaterThan(
      onTheScreen(canvasElement, 'player').getBoundingClientRect().bottom,
    )

    await userEvent.click(fold)
    await columnAtRest(canvasElement)
    await remoteGone(canvasElement)
    await near(meta.getBoundingClientRect().top, top)
    await oneColumn(canvasElement)

    await userEvent.click(fold)
    await inTheColumn(canvasElement, closed)
    await near(meta.getBoundingClientRect().top, top)
  },
}

const ON_THE_LOCKED_PAGE = '520,120,400,225'

export const 入口が移った番組のページがデータボタンで出る: Story = {
  args: {
    readDataBroadcast: async () => ({
      state: 'read',
      timeline: throughout(LOCKING_CATALOG),
    }),
    readDataBroadcastModule: readingModulesOf(lockingModules),
  },
  play: async ({ canvasElement }) => {
    const toggle = await inThePlayer(canvasElement).findByRole(
      'button',
      { name: 'データ放送' },
      { timeout: 10000 },
    )

    await afterTheArrival(canvasElement)
    await userEvent.click(toggle)
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await shrunkTo(canvasElement, ON_THE_LOCKED_PAGE)

    await new Promise((resolve) => setTimeout(resolve, 1200))

    await shrunkTo(canvasElement, ON_THE_LOCKED_PAGE)
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  },
}

/** What the player played while the story ran, heard in place of the speakers. */
const sounds: { heard: () => HeardSound[] } = { heard: () => [] }

export const 効果音: Story = {
  args: {
    readDataBroadcast: async () => ({
      state: 'read',
      timeline: throughout(SOUNDING_CATALOG),
    }),
    readDataBroadcastModule: readingModulesOf(soundingModules),
  },
  beforeEach: () => {
    const hearing = hearingTheSounds()

    sounds.heard = hearing.heard
    document.cookie = forgettingCookie(DATA_BROADCAST_SOUNDS)

    return hearing.stop
  },
  play: async ({ canvasElement }) => {
    const toggle = await inThePlayer(canvasElement).findByRole(
      'button',
      { name: 'データ放送' },
      { timeout: 10000 },
    )
    const volume = inThePlayer(canvasElement).getByRole('slider', {
      name: '音量',
    })

    fireEvent.change(volume, { target: { value: '40' } })
    await expect(volume).toHaveAttribute('aria-valuetext', '40%')
    await afterTheArrival(canvasElement)
    await userEvent.click(toggle)
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await shrunkTo(canvasElement, ON_THE_WEATHER)
    await expect(sounds.heard()).toEqual([
      { sound: 7, gain: romSoundGain(true, 0.4) },
    ])
  },
}
