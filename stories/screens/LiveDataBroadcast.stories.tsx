import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import { catalogPayload } from '@/lib/bml/catalog'
import { modulePayload, type BmlModule } from '@/lib/bml/resources'
import type { ReceiverId, TransmitAnswer } from '@/lib/bml/line'
import type { AppStart } from '@/lib/bml/ait'
import {
  SAID_FAILED,
  SAID_LINE_OFF,
  SAID_RECEIVING,
  SAID_UNOPENED,
  SAID_UNREACHED,
} from '@/lib/data-broadcast-view'
import {
  DATA_BROADCAST_HYBRIDCAST,
  DATA_BROADCAST_LINE,
  DATA_BROADCAST_RECEIVER_ID,
  HYBRIDCAST_SPELLING,
  LINE_SPELLING,
  LIVE_CHANNELS_FOLDED,
  RECEIVER_ID_SPELLING,
  forgettingCookie,
  storingCookie,
} from '@/lib/stored-flag'
import { frameOf, progressPayload, type LiveStartup } from '@/lib/live-wire'
import {
  LIVE_NOW_FIXTURE,
  LIVE_SCREEN_FIXTURE,
} from '@/repository/live.fixtures'
import type {
  LineRelay,
  Relayed,
  StartedApplication,
} from '@/repository/live-data-broadcast'
import type { TicketWrite } from '@/repository/tickets'
import {
  BAND_MAX_SCALE,
  BAND_MOCK_WIDTH,
  BAND_UNDER_THE_BOX,
  DATA_BROADCAST_NAME,
  REMOTE_GROUP_GAP,
  REMOTE_GROUP_GAP_SHORT,
  SHORT_WINDOW,
} from '@/components/data-broadcast/data-broadcast-player'
import type { LiveSocket, OpenSocket } from '@/components/live/live-session'
import { LiveView } from '@/components/live/live-page'
import { afterTheArrival } from '@/stories/after-the-arrival'
import {
  DATA_BROADCAST_CATALOG,
  HYBRIDCAST_AIT,
  HYBRIDCAST_APPLICATION,
  HYBRIDCAST_CATALOG,
  LINE_CATALOG,
  OVER_THE_LINE_PAGES,
  SCRIPTED_CATALOG,
  dataBroadcastModules,
  hybridcastModules,
  lineModules,
  scriptedModules,
} from '@/stories/fixtures/data-broadcast'
import { inTheApp } from '@/stories/frames'

class BroadcastSocket implements LiveSocket {
  binaryType: BinaryType = 'blob'
  readyState = 0
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(frames: Uint8Array[]) {
    setTimeout(() => {
      this.readyState = 1
      this.onopen?.(new Event('open'))
      frames.forEach((frame) => this.say(frame))
    }, 0)
  }

  send() {}

  close(code = 1000) {
    if (this.readyState === 3) {
      return
    }

    this.readyState = 3
    this.onclose?.(new CloseEvent('close', { code }))
  }

  private say(frame: Uint8Array) {
    const copy = frame.slice()

    this.onmessage?.(new MessageEvent('message', { data: copy.buffer }))
  }
}

const LOCKED: LiveStartup = {
  tunerSecured: 496,
  transcoderStarted: 511,
  channelLocked: 751,
}

const PICTURED = frameOf(
  'picture',
  0,
  new Uint8Array([0, 0, 0, 8, 0x6d, 0x6f, 0x6f, 0x66]),
)

function carrying(...broadcast: Uint8Array[]): OpenSocket {
  return () =>
    new BroadcastSocket([
      frameOf('control', 0, progressPayload(LOCKED)),
      PICTURED,
      ...broadcast.map((payload) => frameOf('dataBroadcast', 0, payload)),
    ])
}

const CATALOG = catalogPayload(DATA_BROADCAST_CATALOG)

const ASKING_TO_START = catalogPayload({
  ...DATA_BROADCAST_CATALOG,
  autoStart: true,
})

function modules(only?: number[]): Uint8Array[] {
  return dataBroadcastModules()
    .filter((module) => !only || only.includes(module.id))
    .map(modulePayload)
}

function broken(module: BmlModule): BmlModule {
  return {
    ...module,
    resources: module.resources.map((resource) =>
      resource.path === 'startup.bml'
        ? { ...resource, body: new TextEncoder().encode('<bml><body') }
        : resource,
    ),
  }
}

const SCRIPTED = [
  catalogPayload(SCRIPTED_CATALOG),
  ...scriptedModules().map(modulePayload),
]

const NONE = Uint8Array.of(0x04)

async function ticketed(): Promise<TicketWrite> {
  return {
    state: 'ok',
    ticket: {
      inTheClear: 'Kk3Zq7Xm-a-ticket-that-lapses-in-thirty-secs',
      lapsesAt: '2026-08-08T12:04:30Z',
    },
  }
}

const meta = {
  title: 'Screens/ライブ/データ放送',
  component: LiveView,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/live', query: { ch: '32736-1024' } },
    },
  },
  args: {
    screen: LIVE_SCREEN_FIXTURE,
    onTakeTicket: ticketed,
    clockHeldAt: new Date(LIVE_NOW_FIXTURE),
    openSocket: carrying(CATALOG, ...modules()),
    askSignedOut: async () => false,
    askBacklog: async () => undefined,
  },
  decorators: [inTheApp],
  beforeEach: () => {
    document.cookie = forgettingCookie(LIVE_CHANNELS_FOLDED)
  },
} satisfies Meta<typeof LiveView>

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
  return within(onTheScreen(canvasElement, 'live-player'))
}

function press(on: HTMLElement, key: string) {
  on.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

const AT_THE_START = '560,60,360,203'

const ON_THE_WEATHER = '40,60,360,203'

async function shrunkTo(canvasElement: HTMLElement, rect?: string) {
  const picture = onTheScreen(canvasElement, 'player-picture')

  await waitFor(
    () =>
      rect
        ? expect(picture).toHaveAttribute('data-rect', rect)
        : expect(picture).not.toHaveAttribute('data-rect'),
    { timeout: 5000 },
  )
  await expect(picture.style.transform === '').toBe(rect === undefined)
}

async function opened(canvasElement: HTMLElement) {
  const canvas = within(canvasElement)
  const toggle = await inThePlayer(canvasElement).findByRole('button', {
    name: 'データ放送',
  })

  await afterTheArrival(canvasElement)
  canvasElement.querySelector('video')?.dispatchEvent(new Event('playing'))
  await userEvent.click(toggle)
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await shrunkTo(canvasElement, AT_THE_START)

  return toggle
}

export const 無し: Story = {
  args: { openSocket: carrying(NONE) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const player = onTheScreen(canvasElement, 'live-player')

    await canvas.findByRole('button', { name: '字幕' })
    await afterTheArrival(canvasElement)
    press(player, 'd')

    await expect(
      inThePlayer(canvasElement).queryByRole('button', { name: 'データ放送' }),
    ).toBeNull()
    await remoteGone(canvasElement)
  },
}

export const まだ届いていない: Story = {
  args: { openSocket: carrying(CATALOG, ...modules([0x0001])) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await canvas.findByRole('button', { name: '字幕' })
    await afterTheArrival(canvasElement)

    await expect(
      inThePlayer(canvasElement).queryByRole('button', { name: 'データ放送' }),
    ).toBeNull()
  },
}

export const 自動で開く: Story = {
  args: {
    openSocket: carrying(ASKING_TO_START, ...modules()),
    autoOpensDataBroadcast: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const toggle = await inThePlayer(canvasElement).findByRole('button', {
      name: 'データ放送',
    })

    await afterTheArrival(canvasElement)
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await shrunkTo(canvasElement, AT_THE_START)

    await userEvent.click(toggle)

    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await shrunkTo(canvasElement)
    await expect(canvasElement.querySelector('iframe')).toBeNull()
  },
}

export const 設定が切なら自動で開かない: Story = {
  args: { openSocket: carrying(ASKING_TO_START, ...modules()) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const toggle = await inThePlayer(canvasElement).findByRole('button', {
      name: 'データ放送',
    })

    await afterTheArrival(canvasElement)
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await expect(canvasElement.querySelector('iframe')).toBeNull()
  },
}

export const 放送が求めていなければ自動で開かない: Story = {
  args: { autoOpensDataBroadcast: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const toggle = await inThePlayer(canvasElement).findByRole('button', {
      name: 'データ放送',
    })

    await afterTheArrival(canvasElement)
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await expect(canvasElement.querySelector('iframe')).toBeNull()
  },
}

export const 開ける: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const toggle = await inThePlayer(canvasElement).findByRole('button', {
      name: 'データ放送',
    })

    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await expect(canvasElement.querySelector('iframe')).toBeNull()
    await expect(
      onTheScreen(canvasElement, 'player-picture'),
    ).not.toHaveAttribute('data-rect')

    const row = toggle.closest('div')

    await expect(
      within(row as HTMLElement)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual(expect.arrayContaining(['字幕', 'データ放送', '設定', '全画面']))
  },
}

const KEYS = [
  '戻る',
  '上',
  '下',
  '左',
  '右',
  '決定',
  '青',
  '赤',
  '緑',
  '黄',
  '123 数字',
]

function stirs(player: HTMLElement) {
  player.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }))
}

/** The pointer goes from the bar's control to the panel under the player, as React reads a leave: `pointerout` with where it went. */
function leaves(canvasElement: HTMLElement, control: HTMLElement) {
  control.dispatchEvent(
    new PointerEvent('pointerout', {
      bubbles: true,
      relatedTarget: onTheScreen(canvasElement, 'now-next'),
    }),
  )
}

/** One mock pixel at this player's width: the mock's own below its width, growing with the player, and one and a half at most. */
function unit(playerWidth: number): number {
  return Math.min(BAND_MAX_SCALE, Math.max(1, playerWidth / BAND_MOCK_WIDTH))
}

async function near(got: number, want: number) {
  await expect(Math.abs(got - want)).toBeLessThan(0.6)
}

/** The band drawn out of the control bar over the picture: standing on the bar's top, the scrim under both from the player's bottom up, the bar's own face gone, and the whole gone with the bar. */
async function overThePicture(canvasElement: HTMLElement) {
  const band = within(canvasElement).getByRole('group', {
    name: 'データ放送のリモコン',
  })
  const chrome = onTheScreen(canvasElement, 'player-chrome')
  const controls = onTheScreen(canvasElement, 'player-controls')
  const scrim = onTheScreen(canvasElement, 'data-broadcast-scrim')
  const box = band.getBoundingClientRect()
  const face = onTheScreen(canvasElement, 'player-face').getBoundingClientRect()
  const u = unit(face.width)

  await expect(band).toHaveAttribute('data-place', 'over')
  await near(box.height, 136 * u)
  await near(box.bottom, controls.getBoundingClientRect().top)
  await expect(box.bottom).toBeLessThan(face.bottom)
  await expect(box.top).toBeGreaterThan(face.top)
  await expect(chrome.contains(band)).toBe(true)
  await expect(getComputedStyle(chrome).backgroundColor).toBe(
    'rgba(0, 0, 0, 0)',
  )
  await expect(getComputedStyle(chrome).backgroundImage).toBe('none')
  await expect(getComputedStyle(band).backgroundColor).toBe('rgba(0, 0, 0, 0)')
  await near(scrim.getBoundingClientRect().height, 256 * u)
  await near(scrim.getBoundingClientRect().bottom, face.bottom)
  await expect(getComputedStyle(scrim).backgroundImage).toContain(
    'linear-gradient',
  )
  await expect(chrome).toHaveAttribute('data-up', 'true')

  return band
}

/** The data broadcast open in a window: the control row right under the player's box on its own opaque ground with no scrim, staying when the pointer rests, the title over the picture gone, and the box grown by it with the programme below moved down, so nothing lies over the documents' face. */
async function rowUnderTheBox(canvasElement: HTMLElement) {
  const player = onTheScreen(canvasElement, 'live-player')
  const face = onTheScreen(canvasElement, 'player-face').getBoundingClientRect()
  const chrome = onTheScreen(canvasElement, 'player-chrome')
  const row = chrome.getBoundingClientRect()
  const shell = player.getBoundingClientRect()

  await near(row.top, face.bottom)
  await expect(row.width).toBe(face.width)
  await expect(shell.bottom).toBeLessThanOrEqual(window.innerHeight)
  await expect(getComputedStyle(chrome).backgroundImage).toBe('none')
  await expect(getComputedStyle(chrome).backgroundColor).not.toBe(
    'rgba(0, 0, 0, 0)',
  )
  await expect(
    canvasElement.querySelector('[data-slot="data-broadcast-scrim"]'),
  ).toBeNull()
  await expect(
    canvasElement.querySelector('[data-slot="live-title"]'),
  ).toBeNull()
  await expect(
    onTheScreen(canvasElement, 'now-next').getBoundingClientRect().top,
  ).toBeGreaterThanOrEqual(shell.bottom)

  leaves(
    canvasElement,
    inThePlayer(canvasElement).getByRole('button', { name: 'データ放送' }),
  )
  await waitFor(() => expect(chrome).not.toHaveAttribute('data-up'), {
    timeout: 5000,
  })
  await expect(getComputedStyle(chrome).opacity).toBe('1')
  await near(chrome.getBoundingClientRect().top, face.bottom)

  stirs(player)
  await waitFor(() => expect(chrome).toHaveAttribute('data-up', 'true'))
}

/** The band in a window with no column beside the player: under the control row on the same ground, the station and `データ放送` at its left. */
async function underTheBox(canvasElement: HTMLElement) {
  const band = within(canvasElement).getByRole('group', {
    name: 'データ放送のリモコン',
  })
  const player = onTheScreen(canvasElement, 'live-player')
  const face = onTheScreen(canvasElement, 'player-face').getBoundingClientRect()
  const chrome = onTheScreen(canvasElement, 'player-chrome')
  const box = band.getBoundingClientRect()
  const shell = player.getBoundingClientRect()
  const height = BAND_UNDER_THE_BOX * unit(face.width)

  await expect(band).toHaveAttribute('data-place', 'under')
  await near(box.top, chrome.getBoundingClientRect().bottom)
  await near(box.height, height)
  await expect(box.bottom).toBe(shell.bottom - 1)
  await expect(box.width).toBe(face.width)
  await expect(chrome.contains(band)).toBe(false)
  await expect(getComputedStyle(chrome).backgroundColor).toBe(
    getComputedStyle(band).backgroundColor,
  )
  await expect(
    band.querySelector('[data-slot="station-line"]'),
  ).toHaveTextContent('みなと総合1データ放送')
  await rowUnderTheBox(canvasElement)
  await near(band.getBoundingClientRect().height, height)
  await expect(getComputedStyle(band).opacity).toBe('1')

  return band
}

function theColumn(canvasElement: HTMLElement): HTMLElement {
  const found = canvasElement.querySelector('aside[aria-label="チャンネル"]')

  if (!(found instanceof HTMLElement)) {
    throw new Error('the column is not on the screen')
  }

  return found
}

/** Waits for the column to come to rest after it swapped or folded. */
async function columnAtRest(canvasElement: HTMLElement) {
  const column = theColumn(canvasElement)

  await waitFor(
    () => expect(column.getAnimations({ subtree: true }).length).toBe(0),
    { timeout: 6000 },
  )
}

/** Waits for the column to have taken the remote away, once a fold or a swap has settled. */
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

const REMOTE_KEYS = [
  '上',
  '下',
  '左',
  '右',
  '決定',
  '戻る',
  DATA_BROADCAST_NAME,
  '青',
  '赤',
  '緑',
  '黄',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '0',
]

/** The remote stands at its own height under the column's head: its groups a fixed gap apart, the card as tall as they are, never stretched to the window. */
async function compact(remote: HTMLElement) {
  const gap =
    window.innerHeight < SHORT_WINDOW
      ? REMOTE_GROUP_GAP_SHORT
      : REMOTE_GROUP_GAP
  const card = remote.getBoundingClientRect()
  const groups = [...remote.children].map((group) =>
    group.getBoundingClientRect(),
  )
  const head = onTheScreen(
    remote.ownerDocument.body,
    'column-switch',
  ).getBoundingClientRect()
  const back = within(remote)
    .getByRole('button', { name: '戻る' })
    .getBoundingClientRect()
  const blue = within(remote)
    .getByRole('button', { name: '青' })
    .getBoundingClientRect()

  await expect(Math.abs(card.top - head.bottom - 14)).toBeLessThan(1)
  await near(card.top + 21, groups[0].top)
  await near(card.bottom - 21, groups[groups.length - 1].bottom)
  await near(blue.top - back.bottom, gap)

  for (const [above, below] of groups
    .slice(1)
    .map((group, nth) => [groups[nth], group])) {
    await near(below.top - above.bottom, gap)
  }
}

/** The remote in the column beside the player: `リモコン` chosen at the column's head, the card under it down to the box's bottom, no band anywhere, the box as wide as when the data broadcast was closed, and the control row under it. */
async function inTheColumn(canvasElement: HTMLElement, closedWidth?: number) {
  const column = theColumn(canvasElement)
  const remote = await within(column).findByRole(
    'group',
    { name: 'データ放送のリモコン' },
    { timeout: 6000 },
  )

  await columnAtRest(canvasElement)
  await compact(remote)

  const face = onTheScreen(canvasElement, 'player-face').getBoundingClientRect()
  const card = remote.getBoundingClientRect()

  await expect(remote).toHaveAttribute('data-slot', 'data-broadcast-remote')
  await expect(
    within(column).getByRole('button', { name: 'リモコン' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    within(column).getByRole('button', { name: 'チャンネル一覧' }),
  ).toHaveAttribute('aria-expanded', 'true')
  await near(card.right, column.getBoundingClientRect().right)
  if (closedWidth !== undefined) {
    await near(face.width, closedWidth)
  }

  await expect(
    canvasElement.querySelector('[data-slot="data-broadcast-band"]'),
  ).toBeNull()
  await expect(
    within(remote)
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label') ?? button.textContent),
  ).toEqual(REMOTE_KEYS)
  await rowUnderTheBox(canvasElement)

  return remote
}

function faceWidth(canvasElement: HTMLElement): number {
  return onTheScreen(canvasElement, 'player-face').getBoundingClientRect().width
}

async function closedFaceWidth(canvasElement: HTMLElement): Promise<number> {
  await inThePlayer(canvasElement).findByRole('button', { name: 'データ放送' })
  await afterTheArrival(canvasElement)

  return faceWidth(canvasElement)
}

/** Fullscreen as a page fills the window where the browser has no fullscreen of its own. */
async function filled(canvasElement: HTMLElement) {
  const board = onTheScreen(canvasElement, 'live-player')

  Object.defineProperty(board, 'requestFullscreen', {
    value: undefined,
    configurable: true,
  })

  await opened(canvasElement)
  await userEvent.click(
    within(canvasElement).getByRole('button', { name: '全画面' }),
  )
  await waitFor(() => expect(board).toHaveAttribute('data-fill', 'true'))
}

export const 開いている_PC: Story = {
  parameters: { screen: { width: 1600, height: 1000 } },
  play: async ({ canvasElement }) => {
    const closed = await closedFaceWidth(canvasElement)

    await opened(canvasElement)

    const remote = await inTheColumn(canvasElement, closed)
    const says = onTheScreen(canvasElement, 'data-broadcast-says')
    const player = onTheScreen(canvasElement, 'live-player')

    await expect(says).toHaveAttribute('role', 'status')
    await expect(says).toHaveTextContent('')
    await expect(
      remote.querySelector('[data-slot="station-line"]'),
    ).toHaveTextContent('みなと総合1データ放送')

    await userEvent.click(within(remote).getByRole('button', { name: '下' }))
    await userEvent.click(within(remote).getByRole('button', { name: '決定' }))
    await shrunkTo(canvasElement, ON_THE_WEATHER)
    await expect(document.activeElement).toBe(player)

    await userEvent.click(
      within(remote).getByRole('button', { name: DATA_BROADCAST_NAME }),
    )
    await expect(
      inThePlayer(canvasElement).getByRole('button', { name: 'データ放送' }),
    ).toHaveAttribute('aria-pressed', 'false')
    await shrunkTo(canvasElement)
    await remoteGone(canvasElement)
  },
}

export const 開いている_PC_背の高い窓: Story = {
  parameters: { screen: { width: 1600, height: 1400 } },
  play: async ({ canvasElement }) => {
    await opened(canvasElement)

    await inTheColumn(canvasElement)
  },
}

export const 開いている_PC_ノートの窓: Story = {
  parameters: { screen: { width: 1280, height: 800 } },
  play: async ({ canvasElement }) => {
    await opened(canvasElement)

    const remote = await inTheColumn(canvasElement)
    const disc = within(remote)
      .getByRole('group', { name: '十字' })
      .getBoundingClientRect()

    await expect(remote.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      window.innerHeight,
    )
    await near(disc.width, 152)

    for (const button of within(remote).getAllByRole('button')) {
      const { width, height } = button.getBoundingClientRect()

      await expect(Math.min(width, height)).toBeGreaterThanOrEqual(44)
    }
  },
}

export const 開いている_PC_とても背の高い窓: Story = {
  parameters: { screen: { width: 1920, height: 1800 } },
  play: async ({ canvasElement }) => {
    await opened(canvasElement)
    await inTheColumn(canvasElement)
  },
}

export const 開いている_PC_広い: Story = {
  parameters: { screen: { width: 2400, height: 1200 } },
  play: async ({ canvasElement }) => {
    const closed = await closedFaceWidth(canvasElement)

    await opened(canvasElement)
    await inTheColumn(canvasElement)
    await expect(faceWidth(canvasElement)).toBeLessThanOrEqual(closed)
  },
}

export const 畳んだ列から開くとリモコンが出て閉じると畳む: Story = {
  parameters: { screen: { width: 1600, height: 1000 } },
  args: { channelsFolded: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const column = theColumn(canvasElement)
    const folded = await closedFaceWidth(canvasElement)

    await expect(
      within(column).getByRole('button', { name: 'チャンネル一覧' }),
    ).toHaveAttribute('aria-expanded', 'false')

    const toggle = await opened(canvasElement)

    await inTheColumn(canvasElement)
    await expect(faceWidth(canvasElement)).toBeLessThan(folded)

    await userEvent.click(toggle)
    await columnAtRest(canvasElement)
    await expect(
      within(column).getByRole('button', { name: 'チャンネル一覧' }),
    ).toHaveAttribute('aria-expanded', 'false')
    await remoteGone(canvasElement)
    await near(faceWidth(canvasElement), folded)
  },
}

export const リモコンを出したまま畳む: Story = {
  parameters: { screen: { width: 1600, height: 1000 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const column = theColumn(canvasElement)
    const player = onTheScreen(canvasElement, 'live-player')
    const closed = await closedFaceWidth(canvasElement)
    const toggle = await opened(canvasElement)

    await inTheColumn(canvasElement, closed)
    await userEvent.click(
      within(column).getByRole('button', { name: 'チャンネル一覧' }),
    )
    await columnAtRest(canvasElement)

    await expect(
      within(column).getByRole('button', { name: 'チャンネル一覧' }),
    ).toHaveAttribute('aria-expanded', 'false')
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await remoteGone(canvasElement)
    await expect(faceWidth(canvasElement)).toBeGreaterThan(closed)
    await rowUnderTheBox(canvasElement)

    player.focus()
    press(player, 'ArrowDown')
    press(player, 'Enter')
    await shrunkTo(canvasElement, ON_THE_WEATHER)

    await userEvent.click(toggle)
    await columnAtRest(canvasElement)
    await expect(
      within(column).getByRole('button', { name: 'チャンネル一覧' }),
    ).toHaveAttribute('aria-expanded', 'false')
  },
}

export const 切り替えでチャンネルを出す: Story = {
  parameters: { screen: { width: 1600, height: 1000 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const column = theColumn(canvasElement)
    const closed = await closedFaceWidth(canvasElement)
    const toggle = await opened(canvasElement)

    await inTheColumn(canvasElement, closed)
    await userEvent.click(
      within(column).getByRole('button', { name: 'チャンネル' }),
    )
    await columnAtRest(canvasElement)

    await expect(
      within(column).getByRole('button', { name: 'チャンネル' }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(
      within(column).getByRole('group', { name: '放送の種別' }),
    ).toBeVisible()
    await expect(
      within(column).getByRole('button', { name: /みなと総合2/ }),
    ).toBeVisible()
    await remoteGone(canvasElement)
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await near(faceWidth(canvasElement), closed)

    await userEvent.click(
      within(column).getByRole('button', { name: 'リモコン' }),
    )
    await inTheColumn(canvasElement, closed)

    await userEvent.click(toggle)
    await userEvent.click(toggle)
    await expect(
      await within(column).findByRole('button', { name: 'リモコン' }),
    ).toHaveAttribute('aria-pressed', 'true')
  },
}

export const 開いている_PC_全画面: Story = {
  parameters: { screen: { width: 1600, height: 1000 } },
  play: async ({ canvasElement }) => {
    await filled(canvasElement)

    const band = await overThePicture(canvasElement)
    const { width } = onTheScreen(
      canvasElement,
      'player-stage',
    ).getBoundingClientRect()

    await expect(band.getBoundingClientRect().width).toBe(window.innerWidth)
    await near(band.getBoundingClientRect().height, 136 * unit(width))
  },
}

export const 開いている_縦の_iPad: Story = {
  parameters: { screen: { width: 820, height: 1180 }, coarse: true },
  play: async ({ canvasElement }) => {
    await opened(canvasElement)
    await underTheBox(canvasElement)
  },
}

export const 開いている_横の_iPad_全画面: Story = {
  parameters: { screen: { width: 1180, height: 820 }, coarse: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await filled(canvasElement)

    const band = await overThePicture(canvasElement)
    const stage = onTheScreen(canvasElement, 'player-stage')
    const { width, height, right } = stage.getBoundingClientRect()

    await expect(right).toBe(window.innerWidth)
    await expect(Math.abs(width / height - 16 / 9)).toBeLessThan(0.01)
    await expect(band.getBoundingClientRect().width).toBe(window.innerWidth)

    await userEvent.click(
      within(band).getByRole('button', { name: '123 数字' }),
    )
    await near(band.getBoundingClientRect().height, 136 * unit(width))
    await expect(
      within(band).getByRole('button', { name: '0' }).getBoundingClientRect()
        .top,
    ).toBe(
      within(band).getByRole('button', { name: '青' }).getBoundingClientRect()
        .top,
    )
    await expect(
      canvas.getByRole('button', { name: '全画面' }),
    ).toHaveAttribute('aria-pressed', 'true')
  },
}

export const 鍵の振り分け: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const player = onTheScreen(canvasElement, 'live-player')
    const level = canvas.getByRole('slider', { name: '音量' })
    const toggle = await opened(canvasElement)

    press(player, 'ArrowDown')
    press(player, 'Enter')
    await shrunkTo(canvasElement, ON_THE_WEATHER)
    await expect(level).toHaveValue('100')

    press(player, 'Enter')
    await shrunkTo(canvasElement, AT_THE_START)

    press(player, 'm')
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: '消音' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    )
    press(player, 'm')
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: '消音' })).toHaveAttribute(
        'aria-pressed',
        'false',
      ),
    )

    press(player, 'd')
    await waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'false'))
    await shrunkTo(canvasElement)
    await expect(canvasElement.querySelector('iframe')).toBeNull()

    press(player, 'ArrowDown')
    await waitFor(() => expect(level).toHaveValue('95'))

    press(player, 'D')
    await waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'true'))
    await shrunkTo(canvasElement, AT_THE_START)
  },
}

export const キーパッドで押す: Story = {
  parameters: { screen: { width: 1024, height: 1180 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await opened(canvasElement)

    const keypad = canvas.getByRole('group', { name: 'データ放送のリモコン' })

    await userEvent.click(within(keypad).getByRole('button', { name: '下' }))
    await userEvent.click(within(keypad).getByRole('button', { name: '決定' }))
    await shrunkTo(canvasElement, ON_THE_WEATHER)
    await expect(document.activeElement).toBe(
      onTheScreen(canvasElement, 'live-player'),
    )

    await userEvent.click(
      within(keypad).getByRole('button', { name: '123 数字' }),
    )
    await expect(keypad).toHaveAttribute('data-face', 'numbers')
    await expect(
      within(keypad)
        .getAllByRole('button')
        .map(
          (button) => button.getAttribute('aria-label') ?? button.textContent,
        ),
    ).toEqual([...KEYS, '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'])

    await userEvent.click(within(keypad).getByRole('button', { name: '7' }))
    await expect(document.activeElement).toBe(
      onTheScreen(canvasElement, 'live-player'),
    )

    await userEvent.click(
      within(keypad).getByRole('button', { name: '123 数字' }),
    )
    await expect(keypad).toHaveAttribute('data-face', 'keys')
  },
}

export const 閉じると映像が戻る: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const toggle = await opened(canvasElement)

    await userEvent.click(toggle)
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await shrunkTo(canvasElement)
    await remoteGone(canvasElement)
  },
}

export const 壊れている: Story = {
  args: {
    openSocket: carrying(
      CATALOG,
      ...dataBroadcastModules().map((module) =>
        modulePayload(module.id === 0 ? broken(module) : module),
      ),
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const toggle = await inThePlayer(canvasElement).findByRole('button', {
      name: 'データ放送',
    })

    await afterTheArrival(canvasElement)
    await userEvent.click(toggle)

    await expect(await canvas.findByText(SAID_FAILED)).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await expect(
      inThePlayer(canvasElement).getByRole('button', { name: 'データ放送' }),
    ).toBe(toggle)
    await expect(canvasElement.querySelector('iframe')).toBeNull()
    await shrunkTo(canvasElement)
  },
}

export const 受信中: Story = {
  args: { openSocket: carrying(CATALOG, ...modules([0x0000])) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const player = onTheScreen(canvasElement, 'live-player')

    await opened(canvasElement)
    press(player, 'Enter')

    const says = onTheScreen(canvasElement, 'data-broadcast-says')

    await expect(says).toHaveTextContent('')
    await waitFor(() => expect(says).toHaveTextContent(SAID_RECEIVING), {
      timeout: 6000,
    })
    await expect(onTheScreen(canvasElement, 'data-broadcast-says')).toBe(says)
    await expect(onTheScreen(canvasElement, 'player-picture')).toHaveAttribute(
      'data-rect',
      AT_THE_START,
    )
  },
}

export const キーボードで面を切り替えても鍵が効く: Story = {
  parameters: { screen: { width: 1024, height: 1180 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const player = onTheScreen(canvasElement, 'live-player')

    await opened(canvasElement)

    const keypad = canvas.getByRole('group', { name: 'データ放送のリモコン' })

    within(keypad).getByRole('button', { name: '123 数字' }).focus()
    await userEvent.keyboard('{Enter}')
    await expect(keypad).toHaveAttribute('data-face', 'numbers')
    await expect(document.activeElement).toBe(player)

    within(keypad).getByRole('button', { name: '123 数字' }).focus()
    await userEvent.keyboard('{Enter}')
    await expect(keypad).toHaveAttribute('data-face', 'keys')
    await expect(document.activeElement).toBe(player)

    await userEvent.keyboard('{ArrowDown}{Enter}')
    await shrunkTo(canvasElement, ON_THE_WEATHER)
  },
}

export const 開いてもページは動かない: Story = {
  parameters: { screen: { width: 1024, height: 600 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const player = onTheScreen(canvasElement, 'live-player')
    const toggle = await inThePlayer(canvasElement).findByRole('button', {
      name: 'データ放送',
    })

    await afterTheArrival(canvasElement)
    window.scrollTo(0, 120)
    await waitFor(() => expect(window.scrollY).toBe(120))

    const top = player.getBoundingClientRect().top

    await userEvent.click(toggle)
    await shrunkTo(canvasElement, AT_THE_START)

    const keypad = canvas.getByRole('group', { name: 'データ放送のリモコン' })

    await userEvent.click(within(keypad).getByRole('button', { name: '下' }))
    await userEvent.click(
      within(keypad).getByRole('button', { name: '123 数字' }),
    )
    await userEvent.click(
      within(keypad).getByRole('button', { name: '123 数字' }),
    )
    press(player, 'ArrowUp')
    press(player, 'Backspace')

    await expect(window.scrollY).toBe(120)
    await expect(player.getBoundingClientRect().top).toBe(top)

    press(player, 'd')
    await shrunkTo(canvasElement)
    press(player, 'd')
    await shrunkTo(canvasElement, AT_THE_START)

    await expect(window.scrollY).toBe(120)
    await expect(player.getBoundingClientRect().top).toBe(top)
    window.scrollTo(0, 0)
  },
}

export const キーで開いても矢印でページは動かない: Story = {
  parameters: { screen: { width: 1024, height: 600 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const player = onTheScreen(canvasElement, 'live-player')
    const toggle = await inThePlayer(canvasElement).findByRole('button', {
      name: 'データ放送',
    })
    const pressed = (key: string) =>
      !player.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
      )

    await afterTheArrival(canvasElement)
    canvasElement.querySelector('video')?.dispatchEvent(new Event('playing'))
    window.scrollTo(0, 120)
    await waitFor(() => expect(window.scrollY).toBe(120))

    await expect(pressed('d')).toBe(true)
    await waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'true'))
    await shrunkTo(canvasElement, AT_THE_START)

    await expect(pressed('ArrowDown')).toBe(true)
    await expect(pressed('Enter')).toBe(true)
    await shrunkTo(canvasElement, ON_THE_WEATHER)
    await expect(window.scrollY).toBe(120)
    window.scrollTo(0, 0)
  },
}

export const スクリプトが長すぎると閉じる: Story = {
  args: { openSocket: carrying(...SCRIPTED) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const player = onTheScreen(canvasElement, 'live-player')
    const toggle = await inThePlayer(canvasElement).findByRole('button', {
      name: 'データ放送',
    })

    await afterTheArrival(canvasElement)
    canvasElement.querySelector('video')?.dispatchEvent(new Event('playing'))
    await userEvent.click(toggle)
    await shrunkTo(canvasElement, AT_THE_START)

    press(player, 'ArrowDown')
    press(player, 'Enter')

    await expect(
      await canvas.findByText(SAID_FAILED, {}, { timeout: 8000 }),
    ).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await expect(canvasElement.querySelector('iframe')).toBeNull()
    await shrunkTo(canvasElement)

    await userEvent.click(toggle)
    await shrunkTo(canvasElement, AT_THE_START)
  },
}

const LINE = [catalogPayload(LINE_CATALOG), ...lineModules().map(modulePayload)]

/** What the documents asked over the line in a story: each transmission with its channel, each URL fetched, each AIT read and each application started. */
interface AskedOverTheLine {
  transmitted: string[][]
  fetched: string[]
  aits: string[]
  started: AppStart[]
}

const asked: AskedOverTheLine = {
  transmitted: [],
  fetched: [],
  aits: [],
  started: [],
}

/** The self-made application, served beside the stories in place of the relay, at the address Carina's frame would open; `asked` goes after the entry URL in `uri`, where the application reads what the story asks of it. */
function startedAt(asked = ''): Relayed<StartedApplication> {
  return {
    said: 'answered',
    answer: {
      address: `/hybridcast-app/app.html?uri=${encodeURIComponent(
        `${HYBRIDCAST_APPLICATION.entryUrl}${asked}`,
      )}`,
      application: {
        ...HYBRIDCAST_APPLICATION,
        ait: HYBRIDCAST_AIT,
        boundary: [
          { permissionBitmap: 0x1fff, managedUrls: ['http://example.test'] },
        ],
      },
    },
  }
}

const STARTED = startedAt()

const STARTED_ADDRESS =
  STARTED.said === 'answered' ? STARTED.answer.address : ''

/** What the self-made application last reported of itself. */
const probed: { report: Record<string, string> } = { report: {} }

function listenToTheApplication(): () => void {
  probed.report = {}

  const listen = (event: MessageEvent) => {
    const probe = (event.data as { probe?: Record<string, string> } | null)
      ?.probe
    const frame = document.querySelector('iframe[title="Hybridcast"]')

    if (
      probe &&
      frame instanceof HTMLIFrameElement &&
      event.source === frame.contentWindow
    ) {
      probed.report = { ...probe }
    }
  }

  window.addEventListener('message', listen)

  return () => window.removeEventListener('message', listen)
}

async function theApplicationSaid(name: string, value: string) {
  await waitFor(() => expect(probed.report[name]).toBe(value), {
    timeout: 5000,
  })
}

/** A relay that answers every transmission with `answer` and every fetch from the self-made pages, names `receiverId` as the receiver's identifier, reads the self-made AIT, starts its application as `started` says, and notes what it was asked. */
function relayAnswering(
  answer: TransmitAnswer,
  receiverId: ReceiverId | null = null,
  started: Relayed<StartedApplication> = STARTED,
) {
  return (channel: string): LineRelay => ({
    transmit: async (uri, text, charset) => {
      asked.transmitted.push([channel, uri, text, charset])

      return { said: 'answered', answer }
    },
    fetch: async (uri) => {
      asked.fetched.push(uri)

      const page = OVER_THE_LINE_PAGES[uri]

      return page ? { said: 'answered', answer: page } : { said: 'unreached' }
    },
    receiverId: async () => receiverId,
    ait: async (uri) => {
      asked.aits.push(uri)

      return uri === HYBRIDCAST_AIT
        ? { said: 'answered', answer: [HYBRIDCAST_APPLICATION] }
        : { said: 'unreached' }
    },
    startApplication: async (start) => {
      asked.started.push(start)

      return started
    },
  })
}

function lineSetTo(
  allowed: boolean,
  handsTheReceiverId = false,
  allowsHybridcast = false,
) {
  return () => {
    asked.transmitted.length = 0
    asked.fetched.length = 0
    asked.aits.length = 0
    asked.started.length = 0
    document.cookie = allowed
      ? storingCookie(DATA_BROADCAST_LINE, LINE_SPELLING.yes)
      : forgettingCookie(DATA_BROADCAST_LINE)
    document.cookie = handsTheReceiverId
      ? storingCookie(DATA_BROADCAST_RECEIVER_ID, RECEIVER_ID_SPELLING.yes)
      : forgettingCookie(DATA_BROADCAST_RECEIVER_ID)
    document.cookie = allowsHybridcast
      ? storingCookie(DATA_BROADCAST_HYBRIDCAST, HYBRIDCAST_SPELLING.yes)
      : forgettingCookie(DATA_BROADCAST_HYBRIDCAST)

    const stopListening = listenToTheApplication()

    return () => {
      stopListening()
      document.cookie = forgettingCookie(DATA_BROADCAST_LINE)
      document.cookie = forgettingCookie(DATA_BROADCAST_RECEIVER_ID)
      document.cookie = forgettingCookie(DATA_BROADCAST_HYBRIDCAST)
    }
  }
}

async function openedOnTheLine(canvasElement: HTMLElement) {
  const canvas = within(canvasElement)
  const toggle = await inThePlayer(canvasElement).findByRole('button', {
    name: 'データ放送',
  })

  await afterTheArrival(canvasElement)
  canvasElement.querySelector('video')?.dispatchEvent(new Event('playing'))
  await userEvent.click(toggle)
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
}

export const 通信を使うページ: Story = {
  args: {
    openSocket: carrying(...LINE),
    lineRelayOf: relayAnswering({ result: 1, status: 200, body: '1' }),
  },
  beforeEach: lineSetTo(true),
  play: async ({ canvasElement }) => {
    await openedOnTheLine(canvasElement)
    await shrunkTo(canvasElement, ON_THE_WEATHER)

    await expect(asked.transmitted).toEqual([
      ['32736-1024', 'http://example.test/check.txt', '', 'EUC-JP'],
    ])
    await expect(asked.fetched).toEqual([
      'http://example.test/bml/top.bml',
      'http://example.test/bml/style/top.css',
    ])
    await expect(
      onTheScreen(canvasElement, 'data-broadcast-says'),
    ).toHaveTextContent('')
  },
}

const CARD: ReceiverId = { caSystemId: 5, cardId: '0A0B0C0D0E0F' }

export const 識別子を渡す: Story = {
  args: {
    openSocket: carrying(...LINE),
    lineRelayOf: relayAnswering({ result: 1, status: 200, body: '1' }, CARD),
  },
  beforeEach: lineSetTo(true, true),
  play: async ({ canvasElement }) => {
    await openedOnTheLine(canvasElement)
    await shrunkTo(canvasElement, ON_THE_WEATHER)

    await expect(asked.transmitted).toEqual([
      ['32736-1024', 'http://example.test/check.txt', CARD.cardId, 'EUC-JP'],
    ])
  },
}

export const 識別子は設定で渡さない: Story = {
  args: {
    openSocket: carrying(...LINE),
    lineRelayOf: relayAnswering({ result: 1, status: 200, body: '1' }, CARD),
  },
  beforeEach: lineSetTo(true, false),
  play: async ({ canvasElement }) => {
    await openedOnTheLine(canvasElement)
    await shrunkTo(canvasElement, ON_THE_WEATHER)

    await expect(asked.transmitted).toEqual([
      ['32736-1024', 'http://example.test/check.txt', '', 'EUC-JP'],
    ])
  },
}

export const 通信が設定で切: Story = {
  args: {
    openSocket: carrying(...LINE),
    lineRelayOf: relayAnswering({ result: 1, status: 200, body: '1' }),
  },
  beforeEach: lineSetTo(false),
  play: async ({ canvasElement }) => {
    await openedOnTheLine(canvasElement)

    const says = onTheScreen(canvasElement, 'data-broadcast-says')

    await waitFor(() => expect(says).toHaveTextContent(SAID_LINE_OFF), {
      timeout: 5000,
    })
    await shrunkTo(canvasElement, AT_THE_START)
    await expect(asked.transmitted).toEqual([])
    await expect(asked.fetched).toEqual([])
  },
}

export const 放送局のサーバにつながらない: Story = {
  args: {
    openSocket: carrying(...LINE),
    lineRelayOf: relayAnswering({ result: -400, status: Number.NaN, body: '' }),
  },
  beforeEach: lineSetTo(true),
  play: async ({ canvasElement }) => {
    await openedOnTheLine(canvasElement)

    const says = onTheScreen(canvasElement, 'data-broadcast-says')

    await waitFor(() => expect(says).toHaveTextContent(SAID_UNREACHED), {
      timeout: 5000,
    })
    await shrunkTo(canvasElement, AT_THE_START)
    await expect(asked.transmitted.length).toBe(1)
    await expect(asked.fetched).toEqual([])
  },
}

const HYBRIDCAST = [
  catalogPayload(HYBRIDCAST_CATALOG),
  ...hybridcastModules().map(modulePayload),
]

const STARTING = { ait: HYBRIDCAST_AIT, orgId: 16, appId: 1 }

/** The band once the application runs: the station and Hybridcast at its left, `閉じる` beside them, and the keys as before. */
async function runningOnTheBand(canvasElement: HTMLElement) {
  const canvas = within(canvasElement)
  const group = await canvas.findByRole(
    'group',
    { name: 'Hybridcast' },
    { timeout: 5000 },
  )

  await expect(group).toHaveTextContent('みなと総合1Hybridcast')
  await expect(
    within(group).getByRole('button', { name: 'Hybridcast を閉じる' }),
  ).toHaveTextContent('閉じる')

  return group
}

/** Where the self-made application places the broadcast's picture, on the grid the box is laid by. */
const IN_THE_APPLICATION = '480,60,400,225'

/** The application's frame over the box, opened on the relay, with the picture where the application placed it. */
async function theApplicationRuns(canvasElement: HTMLElement) {
  const face = onTheScreen(canvasElement, 'hybridcast-face')

  await waitFor(() => expect(face).toHaveAttribute('data-started', 'yes'))

  const frame = face.querySelector('iframe')

  await expect(frame).toHaveAttribute('sandbox', 'allow-scripts allow-forms')
  await expect(frame).toHaveAttribute('src', STARTED_ADDRESS)
  await theApplicationSaid('agent', 'hybridcast')
  await shrunkTo(canvasElement, IN_THE_APPLICATION)

  return frame as HTMLIFrameElement
}

async function backAtTheDocuments(canvasElement: HTMLElement) {
  await shrunkTo(canvasElement, AT_THE_START)
  await waitFor(() =>
    expect(
      within(canvasElement).queryByRole('group', { name: 'Hybridcast' }),
    ).toBeNull(),
  )
  await expect(
    canvasElement.querySelector('[data-slot="hybridcast-face"]'),
  ).toBeNull()
}

export const Hybridcast: Story = {
  parameters: { screen: { width: 1600, height: 1000 } },
  args: {
    openSocket: carrying(...HYBRIDCAST),
    lineRelayOf: relayAnswering({ result: 1, status: 200, body: '1' }),
  },
  beforeEach: lineSetTo(true, false, true),
  play: async ({ canvasElement }) => {
    await openedOnTheLine(canvasElement)

    const group = await runningOnTheBand(canvasElement)

    await expect(asked.aits).toEqual([HYBRIDCAST_AIT])
    await expect(asked.started).toEqual([STARTING])
    await theApplicationRuns(canvasElement)
    await theApplicationSaid('greg44', 'back')
    await expect(
      canvasElement.querySelector('[data-slot="data-broadcast-says"]'),
    ).toBeNull()
    await expect(
      inThePlayer(canvasElement).getByRole('button', { name: 'データ放送' }),
    ).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(
      within(group).getByRole('button', { name: 'Hybridcast を閉じる' }),
    )

    await backAtTheDocuments(canvasElement)
    await expect(asked.started).toEqual([STARTING])
  },
}

export const Hybridcast_キー: Story = {
  parameters: { screen: { width: 1600, height: 1000 } },
  args: {
    openSocket: carrying(...HYBRIDCAST),
    lineRelayOf: relayAnswering({ result: 1, status: 200, body: '1' }),
  },
  beforeEach: lineSetTo(true, false, true),
  play: async ({ canvasElement }) => {
    await openedOnTheLine(canvasElement)
    await runningOnTheBand(canvasElement)
    await theApplicationRuns(canvasElement)
    await theApplicationSaid('keyset', '287')

    const player = onTheScreen(canvasElement, 'live-player')

    press(player, 'r')
    press(player, '5')
    await theApplicationSaid('keys', '403,53')

    press(player, 'd')
    await backAtTheDocuments(canvasElement)
  },
}

export const Hybridcast_d_をアプリが取る: Story = {
  parameters: { screen: { width: 1600, height: 1000 } },
  args: {
    openSocket: carrying(...HYBRIDCAST),
    lineRelayOf: relayAnswering(
      { result: 1, status: 200, body: '1' },
      null,
      startedAt('?dbutton'),
    ),
  },
  beforeEach: lineSetTo(true, false, true),
  play: async ({ canvasElement }) => {
    await openedOnTheLine(canvasElement)
    await runningOnTheBand(canvasElement)
    await theApplicationSaid('keyset', String(287 | 0x800))
    await shrunkTo(canvasElement, IN_THE_APPLICATION)

    press(onTheScreen(canvasElement, 'live-player'), 'd')
    await theApplicationSaid('keys', '496')
    await expect(
      within(canvasElement).getByRole('group', { name: 'Hybridcast' }),
    ).toBeVisible()

    await userEvent.click(
      within(theColumn(canvasElement)).getByRole('button', {
        name: 'データ放送',
      }),
    )
    await theApplicationSaid('keys', '496,496')
  },
}

export const Hybridcast_アプリが閉じる: Story = {
  args: {
    openSocket: carrying(...HYBRIDCAST),
    lineRelayOf: relayAnswering({ result: 1, status: 200, body: '1' }),
  },
  beforeEach: lineSetTo(true, false, true),
  play: async ({ canvasElement }) => {
    await openedOnTheLine(canvasElement)
    await theApplicationRuns(canvasElement)

    press(onTheScreen(canvasElement, 'live-player'), 'y')
    await backAtTheDocuments(canvasElement)
    await expect(
      onTheScreen(canvasElement, 'data-broadcast-says'),
    ).toHaveTextContent('')
  },
}

export const Hybridcast_データ放送へ: Story = {
  args: {
    openSocket: carrying(...HYBRIDCAST),
    lineRelayOf: relayAnswering({ result: 1, status: 200, body: '1' }),
  },
  beforeEach: lineSetTo(true, false, true),
  play: async ({ canvasElement }) => {
    await openedOnTheLine(canvasElement)
    await theApplicationRuns(canvasElement)

    press(onTheScreen(canvasElement, 'live-player'), 'g')
    await backAtTheDocuments(canvasElement)
    await expect(asked.started).toEqual([STARTING])
  },
}

export const Hybridcast_枠が中継を離れる: Story = {
  args: {
    openSocket: carrying(...HYBRIDCAST),
    lineRelayOf: relayAnswering({ result: 1, status: 200, body: '1' }),
  },
  beforeEach: lineSetTo(true, false, true),
  play: async ({ canvasElement }) => {
    await openedOnTheLine(canvasElement)

    const frame = await theApplicationRuns(canvasElement)

    frame.contentWindow?.location.replace('/hybridcast-app/outside.html')

    await waitFor(
      () =>
        expect(
          canvasElement.querySelector('[data-slot="hybridcast-face"]'),
        ).toBeNull(),
      { timeout: 6000 },
    )
    await backAtTheDocuments(canvasElement)
    await expect(
      onTheScreen(canvasElement, 'data-broadcast-says'),
    ).toHaveTextContent('')
  },
}

export const Hybridcast_起動中_PC: Story = {
  parameters: { screen: { width: 1600, height: 1000 } },
  args: {
    openSocket: carrying(...HYBRIDCAST),
    lineRelayOf: relayAnswering({ result: 1, status: 200, body: '1' }),
  },
  beforeEach: lineSetTo(true, false, true),
  play: async ({ canvasElement }) => {
    await openedOnTheLine(canvasElement)

    const group = await runningOnTheBand(canvasElement)
    const name = group.querySelector('b') as HTMLElement

    await expect(name.scrollWidth).toBeLessThanOrEqual(name.clientWidth)

    const remote = within(theColumn(canvasElement)).getByRole('group', {
      name: 'データ放送のリモコン',
    })
    const close = within(group)
      .getByRole('button', { name: 'Hybridcast を閉じる' })
      .getBoundingClientRect()
    const disc = within(remote)
      .getByRole('group', { name: '十字' })
      .getBoundingClientRect()

    await expect(remote.contains(group)).toBe(true)
    await expect(Math.min(close.width, close.height)).toBeGreaterThanOrEqual(44)
    await expect(close.bottom).toBeLessThan(disc.top)
    await shrunkTo(canvasElement, IN_THE_APPLICATION)
  },
}

export const Hybridcast_iPad: Story = {
  parameters: { screen: { width: 820, height: 1180 }, coarse: true },
  args: {
    openSocket: carrying(...HYBRIDCAST),
    lineRelayOf: relayAnswering({ result: 1, status: 200, body: '1' }),
  },
  beforeEach: lineSetTo(true, false, true),
  play: async ({ canvasElement }) => {
    await openedOnTheLine(canvasElement)

    const group = await runningOnTheBand(canvasElement)
    const close = within(group)
      .getByRole('button', { name: 'Hybridcast を閉じる' })
      .getBoundingClientRect()
    const back = within(canvasElement)
      .getByRole('button', { name: '戻る' })
      .getBoundingClientRect()

    const name = group.querySelector('b') as HTMLElement

    await expect(name.scrollWidth).toBeLessThanOrEqual(name.clientWidth)
    await expect(Math.min(close.width, close.height)).toBeGreaterThanOrEqual(44)
    await expect(close.right).toBeLessThanOrEqual(back.left)
    await expect(Math.abs(close.top - back.top)).toBeLessThan(1)
  },
}

export const Hybridcast_開けない: Story = {
  args: {
    openSocket: carrying(...HYBRIDCAST),
    lineRelayOf: relayAnswering({ result: 1, status: 200, body: '1' }, null, {
      said: 'unreached',
    }),
  },
  beforeEach: lineSetTo(true, false, true),
  play: async ({ canvasElement }) => {
    await openedOnTheLine(canvasElement)

    await waitFor(
      () =>
        expect(
          onTheScreen(canvasElement, 'data-broadcast-says'),
        ).toHaveTextContent(SAID_UNOPENED),
      { timeout: 5000 },
    )
    await shrunkTo(canvasElement, AT_THE_START)
    await expect(asked.started).toEqual([STARTING])
    await expect(
      within(canvasElement).queryByRole('group', { name: 'Hybridcast' }),
    ).toBeNull()
  },
}

export const Hybridcast_設定が切: Story = {
  args: {
    openSocket: carrying(...HYBRIDCAST),
    lineRelayOf: relayAnswering({ result: 1, status: 200, body: '1' }),
  },
  beforeEach: lineSetTo(true, false, false),
  play: async ({ canvasElement }) => {
    await openedOnTheLine(canvasElement)
    await shrunkTo(canvasElement, AT_THE_START)

    await expect(asked.aits).toEqual([])
    await expect(asked.started).toEqual([])
    await expect(
      onTheScreen(canvasElement, 'data-broadcast-says'),
    ).toHaveTextContent('')
  },
}
