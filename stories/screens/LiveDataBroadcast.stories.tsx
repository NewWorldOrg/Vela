import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import { catalogPayload } from '@/lib/bml/catalog'
import { modulePayload, type BmlModule } from '@/lib/bml/resources'
import { SAID_FAILED, SAID_RECEIVING } from '@/lib/data-broadcast-view'
import { frameOf, progressPayload, type LiveStartup } from '@/lib/live-wire'
import {
  LIVE_NOW_FIXTURE,
  LIVE_SCREEN_FIXTURE,
} from '@/repository/live.fixtures'
import type { TicketWrite } from '@/repository/tickets'
import {
  BAND_MAX_SCALE,
  BAND_MOCK_WIDTH,
  BAND_UNDER_THE_BOX,
} from '@/components/data-broadcast/data-broadcast-player'
import type { LiveSocket, OpenSocket } from '@/components/live/live-session'
import { LiveView } from '@/components/live/live-page'
import { afterTheArrival } from '@/stories/after-the-arrival'
import {
  DATA_BROADCAST_CATALOG,
  SCRIPTED_CATALOG,
  dataBroadcastModules,
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
  const toggle = await canvas.findByRole('button', { name: 'データ放送' })

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
      canvas.queryByRole('button', { name: 'データ放送' }),
    ).toBeNull()
    await expect(
      canvas.queryByRole('group', { name: 'データ放送のリモコン' }),
    ).toBeNull()
  },
}

export const まだ届いていない: Story = {
  args: { openSocket: carrying(CATALOG, ...modules([0x0001])) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await canvas.findByRole('button', { name: '字幕' })
    await afterTheArrival(canvasElement)

    await expect(
      canvas.queryByRole('button', { name: 'データ放送' }),
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
    const toggle = await canvas.findByRole('button', { name: 'データ放送' })

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
    const toggle = await canvas.findByRole('button', { name: 'データ放送' })

    await afterTheArrival(canvasElement)
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await expect(canvasElement.querySelector('iframe')).toBeNull()
  },
}

export const 放送が求めていなければ自動で開かない: Story = {
  args: { autoOpensDataBroadcast: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const toggle = await canvas.findByRole('button', { name: 'データ放送' })

    await afterTheArrival(canvasElement)
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await expect(canvasElement.querySelector('iframe')).toBeNull()
  },
}

export const 開ける: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const toggle = await canvas.findByRole('button', { name: 'データ放送' })

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
async function overThePicture(canvasElement: HTMLElement, fit: string) {
  const band = within(canvasElement).getByRole('group', {
    name: 'データ放送のリモコン',
  })
  const chrome = onTheScreen(canvasElement, 'player-chrome')
  const controls = onTheScreen(canvasElement, 'player-controls')
  const scrim = onTheScreen(canvasElement, 'data-broadcast-scrim')
  const box = band.getBoundingClientRect()
  const face = onTheScreen(canvasElement, 'player-face').getBoundingClientRect()
  const u = unit(face.width)

  await expect(band).toHaveAttribute('data-fit', fit)
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

async function goneWithTheBar(canvasElement: HTMLElement) {
  const player = onTheScreen(canvasElement, 'live-player')
  const chrome = onTheScreen(canvasElement, 'player-chrome')
  const band = within(canvasElement).getByRole('group', {
    name: 'データ放送のリモコン',
  })

  leaves(
    canvasElement,
    within(canvasElement).getByRole('button', { name: 'データ放送' }),
  )
  await waitFor(() => expect(chrome).not.toHaveAttribute('data-up'), {
    timeout: 5000,
  })
  await waitFor(() => expect(getComputedStyle(chrome).opacity).toBe('0'))
  await expect(band.isConnected).toBe(true)

  stirs(player)
  await waitFor(() => expect(chrome).toHaveAttribute('data-up', 'true'))
  await waitFor(() => expect(getComputedStyle(chrome).opacity).toBe('1'))
}

export const 開いている_PC: Story = {
  parameters: { screen: { width: 1600, height: 1000 } },
  play: async ({ canvasElement }) => {
    await opened(canvasElement)

    const band = await overThePicture(canvasElement, 'fine')
    const says = onTheScreen(canvasElement, 'data-broadcast-says')

    await expect(says).toHaveAttribute('role', 'status')
    await expect(says).toHaveTextContent('')
    await expect(
      within(band)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual(KEYS)
    await goneWithTheBar(canvasElement)
  },
}

export const 開いている_PC_広い: Story = {
  parameters: { screen: { width: 2400, height: 1200 } },
  play: async ({ canvasElement }) => {
    await opened(canvasElement)

    const band = await overThePicture(canvasElement, 'fine')
    const face = onTheScreen(
      canvasElement,
      'player-face',
    ).getBoundingClientRect()

    await expect(unit(face.width)).toBeGreaterThan(1)
    await userEvent.click(
      within(band).getByRole('button', { name: '123 数字' }),
    )
    await expect(band).toHaveAttribute('data-face', 'numbers')
    await near(band.getBoundingClientRect().height, 136 * unit(face.width))
  },
}

export const 開いている_縦の_iPad: Story = {
  parameters: { screen: { width: 820, height: 1180 }, coarse: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await opened(canvasElement)

    const band = canvas.getByRole('group', { name: 'データ放送のリモコン' })
    const player = onTheScreen(canvasElement, 'live-player')
    const face = onTheScreen(
      canvasElement,
      'player-face',
    ).getBoundingClientRect()
    const chrome = onTheScreen(canvasElement, 'player-chrome')
    const box = band.getBoundingClientRect()
    const shell = player.getBoundingClientRect()

    await expect(band).toHaveAttribute('data-fit', 'coarse')
    await expect(box.height).toBe(BAND_UNDER_THE_BOX)
    await expect(box.top).toBe(face.bottom)
    await expect(box.bottom).toBe(shell.bottom - 1)
    await expect(box.width).toBe(face.width)
    await expect(box.bottom).toBeLessThanOrEqual(window.innerHeight)
    await expect(chrome.contains(band)).toBe(false)
    await expect(getComputedStyle(chrome).backgroundImage).not.toBe('none')
    await expect(
      onTheScreen(canvasElement, 'now-next').getBoundingClientRect().top,
    ).toBeGreaterThanOrEqual(shell.bottom)

    leaves(canvasElement, canvas.getByRole('button', { name: 'データ放送' }))
    await waitFor(() => expect(chrome).not.toHaveAttribute('data-up'), {
      timeout: 5000,
    })
    await expect(band.getBoundingClientRect().height).toBe(BAND_UNDER_THE_BOX)
    await expect(getComputedStyle(band).opacity).toBe('1')

    stirs(player)
    await waitFor(() => expect(chrome).toHaveAttribute('data-up', 'true'))
  },
}

export const 開いている_横の_iPad_全画面: Story = {
  parameters: { screen: { width: 1180, height: 820 }, coarse: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const board = onTheScreen(canvasElement, 'live-player')

    Object.defineProperty(board, 'requestFullscreen', {
      value: undefined,
      configurable: true,
    })

    await opened(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: '全画面' }))
    await waitFor(() => expect(board).toHaveAttribute('data-fill', 'true'))

    const band = await overThePicture(canvasElement, 'coarse-full')
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
    await expect(
      canvas.queryByRole('group', { name: 'データ放送のリモコン' }),
    ).toBeNull()
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
    const toggle = await canvas.findByRole('button', { name: 'データ放送' })

    await afterTheArrival(canvasElement)
    await userEvent.click(toggle)

    await expect(await canvas.findByText(SAID_FAILED)).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await expect(canvas.getByRole('button', { name: 'データ放送' })).toBe(
      toggle,
    )
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
    const toggle = await canvas.findByRole('button', { name: 'データ放送' })

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

export const スクリプトが長すぎると閉じる: Story = {
  args: { openSocket: carrying(...SCRIPTED) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const player = onTheScreen(canvasElement, 'live-player')
    const toggle = await canvas.findByRole('button', { name: 'データ放送' })

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
