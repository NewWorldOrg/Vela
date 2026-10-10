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
import type { LiveSocket, OpenSocket } from '@/components/live/live-session'
import { LiveView } from '@/components/live/live-page'
import { afterTheArrival } from '@/stories/after-the-arrival'
import {
  DATA_BROADCAST_CATALOG,
  dataBroadcastModules,
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

export const 開いている_PC: Story = {
  parameters: { screen: { width: 1280, height: 900 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await opened(canvasElement)

    const keypad = canvas.getByRole('group', { name: 'データ放送のリモコン' })

    await expect(keypad).toHaveAttribute('data-layout', 'band')
    await expect(keypad.getBoundingClientRect().height).toBe(120)

    const says = onTheScreen(canvasElement, 'data-broadcast-says')

    await expect(says).toHaveAttribute('role', 'status')
    await expect(says).toHaveTextContent('')
    await expect(
      within(keypad)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual([
      '戻る',
      '上',
      '左',
      '下',
      '右',
      '決定',
      '青',
      '赤',
      '緑',
      '黄',
      '123 数字',
    ])
  },
}

export const 開いている_縦の_iPad: Story = {
  parameters: { screen: { width: 768, height: 1024 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await opened(canvasElement)

    const keypad = canvas.getByRole('group', { name: 'データ放送のリモコン' })
    const board = onTheScreen(canvasElement, 'live-player')

    await expect(keypad.getBoundingClientRect().right).toBeLessThanOrEqual(
      board.getBoundingClientRect().right,
    )
    await expect(keypad.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      board.getBoundingClientRect().bottom,
    )
  },
}

export const 開いている_横の_iPad_全画面: Story = {
  parameters: { screen: { width: 1180, height: 820 } },
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

    const keypad = await canvas.findByRole('group', {
      name: 'データ放送のリモコン',
    })
    const area = onTheScreen(canvasElement, 'player-stage-area')
    const stage = onTheScreen(canvasElement, 'player-stage')

    await expect(keypad).toHaveAttribute('data-layout', 'column')
    await expect(keypad.getBoundingClientRect().width).toBe(170)
    await expect(keypad.getBoundingClientRect().right).toBe(window.innerWidth)
    await expect(area.getBoundingClientRect().right).toBe(
      window.innerWidth - 170,
    )
    await expect(stage.getBoundingClientRect().right).toBeLessThanOrEqual(
      keypad.getBoundingClientRect().left,
    )

    const { width, height } = stage.getBoundingClientRect()

    await expect(Math.abs(width / height - 16 / 9)).toBeLessThan(0.01)
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
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual([
      '数字を閉じる',
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
      '決定',
    ])

    await userEvent.click(
      within(keypad).getByRole('button', { name: '数字を閉じる' }),
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

    within(keypad).getByRole('button', { name: '数字を閉じる' }).focus()
    await userEvent.keyboard('{Enter}')
    await expect(keypad).toHaveAttribute('data-face', 'keys')
    await expect(document.activeElement).toBe(player)

    await userEvent.keyboard('{ArrowDown}{Enter}')
    await shrunkTo(canvasElement, ON_THE_WEATHER)
  },
}
