import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import type { Rect } from '@/lib/caption-placement'
import { keyFromKeyboard } from '@/lib/bml/keys'
import type { PlayerMessage, RuntimeMessage } from '@/lib/bml/messages'
import {
  RUNTIME_POLICY,
  RUNTIME_SANDBOX,
  runtimeDocument,
} from '@/lib/bml/runtime-document'
import { GRID } from '@/lib/bml/style'
import type { BandPlace } from '@/lib/data-broadcast-view'

type StripPlace = Exclude<BandPlace, 'column'>
import { cn } from '@/lib/utils'
import {
  BmlFrame,
  type SendToRuntime,
} from '@/components/data-broadcast/bml-frame'
import { fontsForTheRuntime } from '@/components/data-broadcast/bml-fonts'
import { RUNTIME_SCRIPT } from '@/components/data-broadcast/runtime-script.generated'
import {
  BAND_MAX_SCALE,
  BAND_MOCK_WIDTH,
  DataBroadcastBand,
  DataBroadcastRemote,
  REMOTE_LEAST_HEIGHT,
  columnOverTheBand,
} from '@/components/data-broadcast/data-broadcast-player'
import {
  PLAYER_BOARD,
  PLAYER_FACE,
} from '@/components/recordings/player-palette'
import type { BmlCatalog } from '@/lib/bml/catalog'
import type { BmlModule } from '@/lib/bml/resources'
import {
  CURSOR_PROBE,
  DATA_BROADCAST_CATALOG,
  GLYPH_PROBE,
  MENU_CATALOG,
  ROWS_CATALOG,
  SANDBOX_PROBE,
  SCRIPTED_CATALOG,
  dataBroadcastModules,
  menuModules,
  rowModules,
  scriptedModules,
} from '@/stories/fixtures/data-broadcast'
import { DRAWN_FRAME } from '@/stories/fixtures/frames'

const meta = {
  title: 'Components/DataBroadcast',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const DELIVERED_LATE_MS = 400

function placed(rect: Rect | null): CSSProperties {
  if (!rect) {
    return { left: 0, top: 0, width: '100%', height: '100%' }
  }

  return {
    left: `${(rect.left / GRID.width) * 100}%`,
    top: `${(rect.top / GRID.height) * 100}%`,
    width: `${(rect.width / GRID.width) * 100}%`,
    height: `${(rect.height / GRID.height) * 100}%`,
  }
}

function said(rect: Rect | null): string {
  return rect
    ? [rect.left, rect.top, rect.width, rect.height].join(',')
    : 'whole'
}

function Board({
  withheld = [],
  catalog = DATA_BROADCAST_CATALOG,
  broadcast = dataBroadcastModules,
}: {
  withheld?: number[]
  catalog?: BmlCatalog
  broadcast?: () => BmlModule[]
}) {
  const runtime = useRef<SendToRuntime | null>(null)
  const modules = useMemo(() => broadcast(), [broadcast])
  const [rect, setRect] = useState<Rect | null>(null)
  const [heard, setHeard] = useState<Record<string, string>>({})

  const note = (name: string, value: string) =>
    setHeard((before) => ({ ...before, [name]: value }))

  const deliver = (late: boolean) =>
    modules
      .filter((module) => withheld.includes(module.id) === late)
      .forEach((module) => runtime.current?.({ kind: 'module', module }))

  const ready = async (send: SendToRuntime) => {
    runtime.current = send

    const fonts = await fontsForTheRuntime()

    send(
      { kind: 'font', fonts },
      fonts.map((font) => font.bytes),
    )
    send({ kind: 'catalog', catalog })
    deliver(false)
    send({ kind: 'open' })
  }

  const hear = (message: RuntimeMessage) => {
    switch (message.kind) {
      case 'videoRect':
        setRect(message.rect)
        note('video-rect', said(message.rect))
        return
      case 'usedKeys':
        note('used-keys', message.keys.join(' '))
        return
      case 'waiting':
        note('waiting', String(message.waiting))

        if (message.waiting) {
          window.setTimeout(() => deliver(true), DELIVERED_LATE_MS)
        }
        return
      case 'unsupported':
        note('unsupported', message.what)
        return
      case 'memory':
        note('memory', `${message.name}=${message.value ?? ''}`)
        return
      case 'script':
        return
      case 'exit':
        note('exit', 'true')
        return
      case 'error':
        note('error', message.reason)
        return
    }
  }

  return (
    <div className="p-6">
      <div
        role="group"
        aria-label="データ放送"
        tabIndex={0}
        className={cn(PLAYER_BOARD, 'focus-visible:shadow-ring')}
        onKeyDown={(event) => {
          const key = keyFromKeyboard(event)

          if (key) {
            event.preventDefault()
            runtime.current?.({ kind: 'key', key })
          }
        }}
        {...Object.fromEntries(
          Object.entries(heard).map(([name, value]) => [`data-${name}`, value]),
        )}
      >
        <div className={cn(PLAYER_FACE, 'relative')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={DRAWN_FRAME}
            alt=""
            className="absolute object-cover"
            style={placed(rect)}
          />
          <BmlFrame onReady={ready} onMessage={hear} />
        </div>
      </div>
    </div>
  )
}

const OPENED = 'up down left right enter back d blue red green yellow'

export const 起動文書: Story = {
  render: () => <Board />,
  play: async ({ canvasElement }) => {
    const board = within(canvasElement).getByRole('group', {
      name: 'データ放送',
    })
    const frame = canvasElement.querySelector('iframe')

    await waitFor(
      () => expect(board).toHaveAttribute('data-video-rect', '560,60,360,203'),
      { timeout: 5000 },
    )
    await expect(board).toHaveAttribute('data-used-keys', OPENED)
    await expect(board).not.toHaveAttribute('data-error')
    await expect(frame).toHaveAttribute('sandbox', 'allow-scripts')
    await expect(frame?.getAttribute('srcdoc')).toContain(RUNTIME_POLICY)
  },
}

async function press(board: HTMLElement, keys: string) {
  board.focus()
  await userEvent.keyboard(keys)
}

export const 焦点の移動と決定: Story = {
  render: () => <Board withheld={[0x0001]} />,
  play: async ({ canvasElement }) => {
    const board = within(canvasElement).getByRole('group', {
      name: 'データ放送',
    })
    const rectIs = (value: string) =>
      waitFor(() => expect(board).toHaveAttribute('data-video-rect', value), {
        timeout: 5000,
      })

    await rectIs('560,60,360,203')

    await press(board, '{ArrowDown}{Enter}')
    await rectIs('40,60,360,203')

    await press(board, '{Enter}')
    await rectIs('560,60,360,203')

    await press(board, '{ArrowDown}{ArrowDown}{ArrowDown}{Enter}')
    await waitFor(() => expect(board).toHaveAttribute('data-waiting', 'true'))
    await expect(board).toHaveAttribute('data-video-rect', '560,60,360,203')
    await rectIs('600,300,320,180')
    await expect(board).toHaveAttribute('data-waiting', 'false')
    await expect(board).not.toHaveAttribute('data-error')
  },
}

export const スクリプトで切り替わるページ: Story = {
  render: () => (
    <Board catalog={SCRIPTED_CATALOG} broadcast={scriptedModules} />
  ),
  play: async ({ canvasElement }) => {
    const board = within(canvasElement).getByRole('group', {
      name: 'データ放送',
    })
    const rectIs = (value: string) =>
      waitFor(() => expect(board).toHaveAttribute('data-video-rect', value), {
        timeout: 5000,
      })

    await rectIs('560,60,360,203')
    await expect(board).toHaveAttribute('data-used-keys', OPENED)
    await expect(board).not.toHaveAttribute('data-error')

    await press(board, 'y')
    await waitFor(() =>
      expect(board).toHaveAttribute('data-memory', 'visits=AAE='),
    )

    await press(board, 'y')
    await waitFor(() =>
      expect(board).toHaveAttribute('data-memory', 'visits=AAI='),
    )

    await press(board, 'g')
    await waitFor(() =>
      expect(board).toHaveAttribute(
        'data-unsupported',
        'transmitTextDataOverIP',
      ),
    )
    await expect(board).toHaveAttribute('data-video-rect', '560,60,360,203')

    await press(board, '{Enter}')
    await rectIs('40,300,320,180')

    await press(board, '{Enter}')
    await rectIs('560,60,360,203')
    await expect(board).not.toHaveAttribute('data-error')
  },
}

function Probe() {
  const frame = useRef<HTMLIFrameElement>(null)
  const [report, setReport] = useState<Record<string, string>>({})
  const source = useMemo(
    () => runtimeDocument(window.location.origin, SANDBOX_PROBE),
    [],
  )

  useEffect(() => {
    const listen = (event: MessageEvent) => {
      const probe = (event.data as { probe?: Record<string, unknown> } | null)
        ?.probe

      if (event.source !== frame.current?.contentWindow || !probe) {
        return
      }

      setReport({
        ...Object.fromEntries(
          Object.entries(probe).map(([name, value]) => [name, String(value)]),
        ),
        from: event.origin,
      })
    }

    window.addEventListener('message', listen)

    return () => window.removeEventListener('message', listen)
  }, [])

  return (
    <div
      className="p-6"
      role="group"
      aria-label="放送の文書から届かないもの"
      {...Object.fromEntries(
        Object.entries(report).map(([name, value]) => [`data-${name}`, value]),
      )}
    >
      <iframe
        ref={frame}
        title="データ放送"
        srcDoc={source}
        sandbox={RUNTIME_SANDBOX}
        onLoad={() => {
          document.cookie = 'vela-probe=1; path=/; max-age=60'
          frame.current?.contentWindow?.postMessage('probe', '*')
        }}
        className="h-24 w-96 border-0"
      />
    </div>
  )
}

export const 放送の文書から届かないもの: Story = {
  render: () => <Probe />,
  play: async ({ canvasElement }) => {
    const report = within(canvasElement).getByRole('group', {
      name: '放送の文書から届かないもの',
    })

    await waitFor(() => expect(report).toHaveAttribute('data-origin'), {
      timeout: 5000,
    })
    await expect(report).toHaveAttribute('data-origin', 'null')
    await expect(report).toHaveAttribute('data-from', 'null')
    await expect(report).toHaveAttribute('data-cookie', 'SecurityError')
    await expect(report).toHaveAttribute('data-storage', 'SecurityError')
    await expect(report).toHaveAttribute('data-parent', 'SecurityError')
    await expect(report).toHaveAttribute('data-fetch', 'TypeError')
    await expect(report).toHaveAttribute('data-image', 'refused')
    await expect(report.getAttribute('data-violations')).toContain(
      'connect-src',
    )
    await expect(report.getAttribute('data-violations')).toContain('img-src')
  },
}

/** The runtime in a frame of its own with a probe beside it, drawing a document and saying what the probe measured of it. */
function Measured({
  label,
  catalog,
  modules,
  probe,
}: {
  label: string
  catalog: BmlCatalog
  modules: () => BmlModule[]
  probe: string
}) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [report, setReport] = useState<Record<string, string>>({})
  const source = useMemo(
    () =>
      runtimeDocument(window.location.origin, `${RUNTIME_SCRIPT}\n${probe}`),
    [probe],
  )

  useEffect(() => {
    const listen = (event: MessageEvent) => {
      const probe = (event.data as { probe?: Record<string, unknown> } | null)
        ?.probe

      if (event.source !== frame.current?.contentWindow || !probe) {
        return
      }

      setReport(
        Object.fromEntries(
          Object.entries(probe).map(([name, value]) => [name, String(value)]),
        ),
      )
    }

    window.addEventListener('message', listen)

    return () => window.removeEventListener('message', listen)
  }, [])

  const open = async () => {
    const runtime = frame.current?.contentWindow

    if (!runtime) {
      return
    }

    const send = (message: PlayerMessage, transfer: Transferable[] = []) =>
      runtime.postMessage(message, '*', transfer)
    const fonts = await fontsForTheRuntime()

    send(
      { kind: 'font', fonts },
      fonts.map((font) => font.bytes),
    )
    send({ kind: 'catalog', catalog })
    modules().forEach((module) => send({ kind: 'module', module }))
    send({ kind: 'open' })
  }

  return (
    <div
      className="p-6"
      role="group"
      aria-label={label}
      {...Object.fromEntries(
        Object.entries(report).map(([name, value]) => [`data-${name}`, value]),
      )}
    >
      <div className={PLAYER_BOARD}>
        <div className={cn(PLAYER_FACE, 'relative')}>
          <iframe
            ref={frame}
            title="データ放送"
            srcDoc={source}
            sandbox={RUNTIME_SANDBOX}
            onLoad={() => void open()}
            className="absolute inset-0 size-full border-0 [color-scheme:normal]"
          />
        </div>
      </div>
    </div>
  )
}

const HALF_A_PIXEL = 0.5

export const 文字の大きさと同じ高さの行: Story = {
  render: () => (
    <Measured
      label="文字の大きさと同じ高さの行"
      catalog={ROWS_CATALOG}
      modules={rowModules}
      probe={GLYPH_PROBE}
    />
  ),
  play: async ({ canvasElement }) => {
    const rows = within(canvasElement).getByRole('group', {
      name: '文字の大きさと同じ高さの行',
    })
    const measured = (name: string) => Number(rows.getAttribute(`data-${name}`))

    await waitFor(() => expect(rows).toHaveAttribute('data-rows', '4'), {
      timeout: 5000,
    })
    await expect(rows).toHaveAttribute('data-font', '16px')
    await expect(rows).toHaveAttribute('data-overflow', '0')
    await expect(measured('above')).toBeLessThanOrEqual(HALF_A_PIXEL)
    await expect(measured('below')).toBeLessThanOrEqual(HALF_A_PIXEL)
  },
}

const CURSOR_MARGIN = 4

export const カーソルの枠と行: Story = {
  render: () => (
    <Measured
      label="カーソルの枠と行"
      catalog={MENU_CATALOG}
      modules={menuModules}
      probe={CURSOR_PROBE}
    />
  ),
  play: async ({ canvasElement }) => {
    const menu = within(canvasElement).getByRole('group', {
      name: 'カーソルの枠と行',
    })
    const measured = (name: string) => Number(menu.getAttribute(`data-${name}`))

    await waitFor(() => expect(menu).toHaveAttribute('data-frame-above'), {
      timeout: 5000,
    })
    await expect(measured('frame-above')).toBe(CURSOR_MARGIN)
    await expect(measured('frame-below')).toBe(CURSOR_MARGIN)
    await expect(
      Math.abs(measured('text-above') - measured('text-below')),
    ).toBeLessThanOrEqual(HALF_A_PIXEL)
  },
}

/** The bar's row under the box, as `h-16` draws it. */
const BAR_HEIGHT = 64

/** A player's box with the band drawn out of it, as the live player lays it: in a window the bar's row and the band stand under the box, which the column narrows to leave them their room; in fullscreen the band stands over the picture on the box's bottom, with the bar's row under it. */
function Band({
  place,
  numbers: shownFirst,
  station,
  watching,
}: {
  place: StripPlace
  numbers: boolean
  station?: string
  watching?: string
}) {
  const [numbers, setNumbers] = useState(shownFirst)
  const [pressed, setPressed] = useState<string[]>([])
  const [running, setRunning] = useState(station !== undefined)
  const band = (
    <DataBroadcastBand
      place={place}
      numbers={numbers}
      onNumbers={setNumbers}
      onKey={(key) => setPressed((before) => [...before, key])}
      onAim={() => undefined}
      station={watching}
      application={
        running && station !== undefined
          ? { station, onClose: () => setRunning(false) }
          : null
      }
    />
  )

  return (
    <div className="p-6" data-pressed={pressed.join(' ')}>
      <div
        data-slot="board"
        style={{
          maxWidth:
            place === 'under' ? columnOverTheBand(BAR_HEIGHT) : undefined,
        }}
        className={PLAYER_BOARD}
      >
        <div data-slot="face" className={cn(PLAYER_FACE, 'relative')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={DRAWN_FRAME}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
          {place === 'over' && (
            <div className="absolute inset-x-0 bottom-0 z-10">
              {band}
              <div data-slot="bar" className="h-16" />
            </div>
          )}
        </div>
        {place === 'under' && (
          <>
            <div data-slot="bar" className="h-16 bg-(--pl-bg)" />
            {band}
          </>
        )}
      </div>
    </div>
  )
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

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

/** The mock's measures at its player's width: the band, the pills, the disc, Enter, the dots and the digits, and the pitch of the dots and the digits. */
const MOCK = {
  band: 136,
  scrim: 256,
  pill: [56, 44],
  disc: 136,
  enter: 48,
  dot: 44,
  pitch: 54,
  key: 44,
  keyPitch: 52,
  gap: 20,
}

/** One mock pixel at this player's width: the mock's own below its width, growing with the player, and one and a half at most. */
function unit(playerWidth: number): number {
  return Math.min(BAND_MAX_SCALE, Math.max(1, playerWidth / BAND_MOCK_WIDTH))
}

function named(band: HTMLElement): string[] {
  return within(band)
    .getAllByRole('button')
    .map((button) => button.getAttribute('aria-label') ?? button.textContent)
}

function pitchOf(buttons: HTMLElement[]): number {
  const [first, second] = buttons.map((button) =>
    button.getBoundingClientRect(),
  )

  return second.left - first.left
}

async function near(got: number, want: number) {
  await expect(Math.abs(got - want)).toBeLessThan(0.6)
}

/** The band as the mock draws it, scaled to this player: each key's size, the pitch of the dots, the row's height, and its right edge 16px in from the player's. */
async function asTheMock(canvasElement: HTMLElement, place: StripPlace) {
  const band = within(canvasElement).getByRole('group', {
    name: 'データ放送のリモコン',
  })
  const keys = within(band)
  const box = band.getBoundingClientRect()
  const face = (
    canvasElement.querySelector('[data-slot="face"]') as HTMLElement
  ).getBoundingClientRect()
  const u = unit(face.width)
  const disc = keys.getByRole('group', { name: '十字' }).getBoundingClientRect()
  const back = keys
    .getByRole('button', { name: '戻る' })
    .getBoundingClientRect()
  const enter = keys
    .getByRole('button', { name: '決定' })
    .getBoundingClientRect()
  const dots = ['青', '赤', '緑', '黄'].map((name) =>
    keys.getByRole('button', { name }),
  )
  const dot = dots[0].getBoundingClientRect()
  const buttons = keys.getAllByRole('button')
  const rightmost = buttons[buttons.length - 1].getBoundingClientRect()

  await expect(band).toHaveAttribute('data-place', place)
  await near(box.width, face.width)
  await near(
    box.right - rightmost.right,
    parseFloat(getComputedStyle(band).paddingRight),
  )
  await near(back.width, MOCK.pill[0] * u)
  await near(back.height, MOCK.pill[1] * u)
  await near(disc.width, MOCK.disc * u)
  await near(disc.height, MOCK.disc * u)
  await near(disc.left - back.right, MOCK.gap * u)
  await near(enter.width, MOCK.enter * u)
  await near(enter.left + enter.width / 2, disc.left + disc.width / 2)
  await near(enter.top + enter.height / 2, disc.top + disc.height / 2)
  await near(
    dots[0].querySelector('i')?.getBoundingClientRect().width ?? 0,
    MOCK.dot * u,
  )
  await near(dot.height, MOCK.dot * u)
  await near(pitchOf(dots), MOCK.pitch * u)
  await near(disc.top + disc.height / 2, back.top + back.height / 2)
  await near(disc.top + disc.height / 2, dot.top + dot.height / 2)

  if (place === 'under') {
    const bar = (
      canvasElement.querySelector('[data-slot="bar"]') as HTMLElement
    ).getBoundingClientRect()

    await near(bar.top, face.bottom)
    await near(box.top, bar.bottom)
    await near(box.bottom - disc.bottom, 12 * u)
    await expect(getComputedStyle(band).backgroundColor).toBe('rgb(21, 20, 24)')
    await expect(
      canvasElement.querySelector('[data-slot="data-broadcast-scrim"]'),
    ).toBeNull()
  } else {
    const scrim = canvasElement.querySelector(
      '[data-slot="data-broadcast-scrim"]',
    ) as HTMLElement
    const bar = (
      canvasElement.querySelector('[data-slot="bar"]') as HTMLElement
    ).getBoundingClientRect()

    await near(disc.bottom, bar.top)
    await near(scrim.getBoundingClientRect().height, MOCK.scrim * u)
    await near(scrim.getBoundingClientRect().bottom, face.bottom)
    await expect(getComputedStyle(scrim).backgroundImage).toContain(
      'linear-gradient',
    )
    await expect(getComputedStyle(band).backgroundColor).toBe(
      'rgba(0, 0, 0, 0)',
    )
  }

  return { band, u }
}

/** The digits as the mock draws them: 44px discs at a 52px pitch, scaled, beside `123` when there is room and on the row above it when there is not. */
async function digitsAsTheMock(band: HTMLElement, u: number) {
  const keys = within(band)
  const digits = DIGITS.map((name) => keys.getByRole('button', { name }))
  const one = digits[0].getBoundingClientRect()
  const toNumbers = keys
    .getByRole('button', { name: '123 数字' })
    .getBoundingClientRect()

  await expect(band).toHaveAttribute('data-face', 'numbers')
  await expect(keys.getByRole('button', { name: '123 数字' })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  await near(one.width, MOCK.key * u)
  await near(one.height, MOCK.key * u)
  await near(pitchOf(digits), MOCK.keyPitch * u)

  return { digits, toNumbers }
}

async function beside(band: HTMLElement, u: number) {
  const { digits, toNumbers } = await digitsAsTheMock(band, u)
  const one = digits[0].getBoundingClientRect()

  await near(one.left - toNumbers.right, MOCK.gap * u)
  await near(one.top + one.height / 2, toNumbers.top + toNumbers.height / 2)
}

async function above(band: HTMLElement, u: number) {
  const { digits, toNumbers } = await digitsAsTheMock(band, u)
  const last = digits[9].getBoundingClientRect()

  await expect(last.bottom).toBeLessThanOrEqual(toNumbers.top)
  await near(last.right, toNumbers.right)
}

async function fingerSized(band: HTMLElement) {
  for (const button of within(band).getAllByRole('button')) {
    const { width, height } = button.getBoundingClientRect()

    await expect(Math.min(width, height)).toBeGreaterThanOrEqual(44)
  }
}

export const 帯_PC: Story = {
  parameters: { screen: { width: 1600, height: 1000 } },
  render: () => <Band place="under" numbers={false} />,
  play: async ({ canvasElement }) => {
    const { band } = await asTheMock(canvasElement, 'under')
    const tray = canvasElement.querySelector('[data-pressed]')

    await underTheFace(canvasElement)

    await expect(named(band)).toEqual(KEYS)
    await fingerSized(band)

    for (const name of ['上', '右', '下', '左', '決定', '戻る', '青', '黄']) {
      await userEvent.click(within(band).getByRole('button', { name }))
    }

    await expect(tray).toHaveAttribute(
      'data-pressed',
      'up right down left enter back blue yellow',
    )
  },
}

export const 帯_PC_数字: Story = {
  parameters: { screen: { width: 1600, height: 1000 } },
  render: () => <Band place="under" numbers />,
  play: async ({ canvasElement }) => {
    const { band, u } = await asTheMock(canvasElement, 'under')

    await above(band, u)
    await expect(named(band)).toEqual([...KEYS, ...DIGITS])

    await userEvent.click(within(band).getByRole('button', { name: '7' }))
    await userEvent.click(within(band).getByRole('button', { name: '0' }))
    await expect(canvasElement.querySelector('[data-pressed]')).toHaveAttribute(
      'data-pressed',
      '7 0',
    )

    await userEvent.click(
      within(band).getByRole('button', { name: '123 数字' }),
    )
    await expect(band).toHaveAttribute('data-face', 'keys')
    await expect(named(band)).toEqual(KEYS)
    await near(band.getBoundingClientRect().height, (MOCK.band + 24) * u)
  },
}

export const 帯_PC_広い: Story = {
  parameters: { screen: { width: 2400, height: 1200 } },
  render: () => <Band place="under" numbers={false} />,
  play: async ({ canvasElement }) => {
    const { band, u } = await asTheMock(canvasElement, 'under')

    await expect(u).toBeGreaterThan(1)
    await expect(named(band)).toEqual(KEYS)
    await underTheFace(canvasElement)
  },
}

export const 帯_PC_広い_数字: Story = {
  parameters: { screen: { width: 2400, height: 1200 } },
  render: () => <Band place="under" numbers />,
  play: async ({ canvasElement }) => {
    const { band, u } = await asTheMock(canvasElement, 'under')

    await beside(band, u)
  },
}

/** The bar's row and the band in a window leave the picture and the documents' face whole: they stand under the box, and the board grows by both and still fits the window's height. */
async function underTheFace(canvasElement: HTMLElement) {
  const band = within(canvasElement).getByRole('group', {
    name: 'データ放送のリモコン',
  })
  const face = (
    canvasElement.querySelector('[data-slot="face"]') as HTMLElement
  ).getBoundingClientRect()
  const board = (
    canvasElement.querySelector('[data-slot="board"]') as HTMLElement
  ).getBoundingClientRect()

  await expect(band.getBoundingClientRect().top).toBeGreaterThanOrEqual(
    face.bottom - 0.6,
  )
  await near(board.bottom - 1, band.getBoundingClientRect().bottom)
  await expect(board.bottom).toBeLessThanOrEqual(window.innerHeight)
}

export const 帯_PC_全画面: Story = {
  parameters: { screen: { width: 1600, height: 1000 } },
  render: () => <Band place="over" numbers={false} />,
  play: async ({ canvasElement }) => {
    const { band } = await asTheMock(canvasElement, 'over')

    await expect(named(band)).toEqual(KEYS)
    await fingerSized(band)
  },
}

export const 帯_PC_全画面_数字: Story = {
  parameters: { screen: { width: 1600, height: 1000 } },
  render: () => <Band place="over" numbers />,
  play: async ({ canvasElement }) => {
    const { band, u } = await asTheMock(canvasElement, 'over')

    await beside(band, u)
    await near(band.getBoundingClientRect().height, MOCK.band * u)
  },
}

export const 帯_iPad_窓: Story = {
  parameters: { screen: { width: 820, height: 1180 } },
  render: () => <Band place="under" numbers={false} />,
  play: async ({ canvasElement }) => {
    const { band, u } = await asTheMock(canvasElement, 'under')

    await expect(u).toBe(1)
    await expect(named(band)).toEqual(KEYS)
    await fingerSized(band)
  },
}

export const 帯_iPad_窓_数字: Story = {
  parameters: { screen: { width: 820, height: 1180 } },
  render: () => <Band place="under" numbers />,
  play: async ({ canvasElement }) => {
    const { band, u } = await asTheMock(canvasElement, 'under')
    const face = (
      canvasElement.querySelector('[data-slot="face"]') as HTMLElement
    ).getBoundingClientRect()

    await above(band, u)
    await near(band.getBoundingClientRect().top, face.bottom + 64)
    await near(band.getBoundingClientRect().height, MOCK.band + 24 + 12 + 44)

    await userEvent.click(
      within(band).getByRole('button', { name: '123 数字' }),
    )
    await expect(band).toHaveAttribute('data-face', 'keys')
    await near(band.getBoundingClientRect().height, MOCK.band + 24)
  },
}

export const 帯_iPad_全画面: Story = {
  parameters: { screen: { width: 1180, height: 820 } },
  render: () => <Band place="over" numbers={false} />,
  play: async ({ canvasElement }) => {
    const { band } = await asTheMock(canvasElement, 'over')

    await expect(named(band)).toEqual(KEYS)
    await fingerSized(band)
  },
}

export const 帯_iPad_全画面_数字: Story = {
  parameters: { screen: { width: 1180, height: 820 } },
  render: () => <Band place="over" numbers />,
  play: async ({ canvasElement }) => {
    const { band, u } = await asTheMock(canvasElement, 'over')
    const bar = (
      canvasElement.querySelector('[data-slot="bar"]') as HTMLElement
    ).getBoundingClientRect()

    await beside(band, u)
    await near(band.getBoundingClientRect().bottom, bar.top)
  },
}

const STATION = 'みなと総合1'

export const 帯_iPad_窓_局名: Story = {
  parameters: { screen: { width: 820, height: 1180 } },
  render: () => <Band place="under" numbers={false} watching={STATION} />,
  play: async ({ canvasElement }) => {
    const { band, u } = await asTheMock(canvasElement, 'under')
    const line = band.querySelector('[data-slot="station-line"]') as HTMLElement
    const back = within(band)
      .getByRole('button', { name: '戻る' })
      .getBoundingClientRect()

    await expect(line).toHaveTextContent(`${STATION}データ放送`)
    await near(
      line.getBoundingClientRect().left,
      band.getBoundingClientRect().left +
        parseFloat(getComputedStyle(band).paddingLeft),
    )
    await expect(line.getBoundingClientRect().right).toBeLessThanOrEqual(
      back.left - MOCK.gap * u + 0.6,
    )
    await expect(named(band)).toEqual(KEYS)
  },
}

/** The column the remote stands in, at the mock's 370px and as tall as the player's box beside it less the column's head. */
function InTheColumn({
  height,
  running,
}: {
  height: number
  running?: boolean
}) {
  const [pressed, setPressed] = useState<string[]>([])
  const [application, setApplication] = useState(running ?? false)

  return (
    <div className="p-6" data-pressed={pressed.join(' ')}>
      <div data-slot="column" style={{ width: 370, height }}>
        <DataBroadcastRemote
          station={STATION}
          onKey={(key) => setPressed((before) => [...before, key])}
          onAim={() => undefined}
          application={
            application ? { onClose: () => setApplication(false) } : null
          }
        />
      </div>
    </div>
  )
}

const REMOTE_KEYS = [
  '上',
  '下',
  '左',
  '右',
  '決定',
  '戻る',
  '青',
  '赤',
  '緑',
  '黄',
  ...DIGITS,
]

/** The remote as the mock draws it in the column: the disc of 184 with Enter of 65 and `戻る` of 64x44 at its lower left, the dots of 52 at a pitch of 70 in the middle, the digits three to a row with 0 alone in the middle of the fourth, no `123`, and the groups sharing out the height at least 24 apart. */
async function asTheColumnMock(canvasElement: HTMLElement) {
  const remote = within(canvasElement).getByRole('group', {
    name: 'データ放送のリモコン',
  })
  const keys = within(remote)
  const card = remote.getBoundingClientRect()
  const disc = keys.getByRole('group', { name: '十字' }).getBoundingClientRect()
  const back = keys
    .getByRole('button', { name: '戻る' })
    .getBoundingClientRect()
  const enter = keys
    .getByRole('button', { name: '決定' })
    .getBoundingClientRect()
  const dots = ['青', '赤', '緑', '黄'].map((name) =>
    keys.getByRole('button', { name }),
  )
  const digits = DIGITS.map((name) => keys.getByRole('button', { name }))
  const at = (name: string) =>
    keys.getByRole('button', { name }).getBoundingClientRect()

  await near(card.width, 370)
  await near(disc.width, 184)
  await near(enter.width, 65)
  await near(back.width, 64)
  await near(back.height, 44)
  await near(back.left, card.left + 21)
  await near(back.bottom, disc.bottom)
  await near(disc.left + disc.width / 2, card.left + card.width / 2)
  await near(dots[0].getBoundingClientRect().width, 52)
  await near(pitchOf(dots), 70)
  await near(
    (dots[0].getBoundingClientRect().left +
      dots[3].getBoundingClientRect().right) /
      2,
    card.left + card.width / 2,
  )
  await near(at('1').height, 48)
  await expect(at('1').width).toBeGreaterThanOrEqual(96)
  await near(at('2').left - at('1').right, 18)
  await near(at('4').top - at('1').bottom, 14)
  await near(at('0').left, at('8').left)
  await near(at('0').top - at('7').bottom, 14)
  await expect(keys.queryByRole('button', { name: '123 数字' })).toBeNull()
  await expect(
    disc.top - keys.getByText(STATION).getBoundingClientRect().bottom,
  ).toBeGreaterThanOrEqual(24)
  await expect(
    dots[0].getBoundingClientRect().top - disc.bottom,
  ).toBeGreaterThanOrEqual(24 - 0.6)
  await expect(
    at('1').top - dots[0].getBoundingClientRect().bottom,
  ).toBeGreaterThanOrEqual(24 - 0.6)
  await near(card.bottom - digits[9].getBoundingClientRect().bottom, 21)
  await fingerSized(remote)

  return remote
}

export const リモコン_列: Story = {
  parameters: { screen: { width: 1600, height: 1000 } },
  render: () => <InTheColumn height={657} />,
  play: async ({ canvasElement }) => {
    const remote = await asTheColumnMock(canvasElement)
    const line = remote.querySelector(
      '[data-slot="station-line"]',
    ) as HTMLElement

    await expect(line).toHaveTextContent(`${STATION}データ放送`)
    await expect(named(remote)).toEqual(REMOTE_KEYS)
    await near(remote.getBoundingClientRect().height, 657)

    for (const name of ['上', '決定', '戻る', '青', '7', '0']) {
      await userEvent.click(within(remote).getByRole('button', { name }))
    }

    await expect(canvasElement.querySelector('[data-pressed]')).toHaveAttribute(
      'data-pressed',
      'up enter back blue 7 0',
    )
  },
}

export const リモコン_列_低い: Story = {
  parameters: { screen: { width: 1600, height: 1000 } },
  render: () => <InTheColumn height={400} />,
  play: async ({ canvasElement }) => {
    const remote = await asTheColumnMock(canvasElement)

    await near(remote.getBoundingClientRect().height, REMOTE_LEAST_HEIGHT)
  },
}

export const リモコン_列_Hybridcast: Story = {
  parameters: { screen: { width: 1600, height: 1000 } },
  render: () => <InTheColumn height={657} running />,
  play: async ({ canvasElement }) => {
    const remote = await asTheColumnMock(canvasElement)
    const group = within(remote).getByRole('group', { name: 'Hybridcast' })
    const close = within(group).getByRole('button', {
      name: 'Hybridcast を閉じる',
    })
    const disc = within(remote)
      .getByRole('group', { name: '十字' })
      .getBoundingClientRect()

    await expect(group).toHaveTextContent(`${STATION}Hybridcast閉じる`)
    await near(close.getBoundingClientRect().width, 64)
    await near(close.getBoundingClientRect().height, 44)
    await near(
      close.getBoundingClientRect().right,
      remote.getBoundingClientRect().right - 21,
    )
    await expect(close.getBoundingClientRect().bottom).toBeLessThan(disc.top)

    await userEvent.click(close)
    await expect(
      within(remote).queryByRole('group', { name: 'Hybridcast' }),
    ).toBeNull()
    await near(
      within(remote)
        .getByRole('group', { name: '十字' })
        .getBoundingClientRect().top,
      disc.top,
    )
  },
}

/** The station's name is cut short only when it has no more room to take: then `閉じる` stands one gap from `戻る`, with nothing free between them. `Hybridcast` is never cut. */
async function cutOnlyWithoutRoom(band: HTMLElement, u: number) {
  const group = within(band).getByRole('group', { name: 'Hybridcast' })
  const name = group.querySelector('b') as HTMLElement
  const said = name.nextElementSibling as HTMLElement
  const close = within(group)
    .getByRole('button', { name: 'Hybridcast を閉じる' })
    .getBoundingClientRect()
  const back = within(band)
    .getByRole('button', { name: '戻る' })
    .getBoundingClientRect()

  await expect(said).toHaveTextContent('Hybridcast')
  await expect(said.scrollWidth).toBeLessThanOrEqual(said.clientWidth)

  if (name.scrollWidth > name.clientWidth) {
    await near(back.left - close.right, MOCK.gap * u)
  }

  return { name, cut: name.scrollWidth > name.clientWidth }
}

/** The band while a Hybridcast application runs: the station and Hybridcast at its left, `閉じる` at a finger's size beside them, the keys where the mock puts them, and `閉じる` taking it away. */
async function withTheApplication(
  canvasElement: HTMLElement,
  place: StripPlace,
) {
  const { band, u } = await asTheMock(canvasElement, place)
  const group = within(band).getByRole('group', { name: 'Hybridcast' })
  const close = within(group).getByRole('button', {
    name: 'Hybridcast を閉じる',
  })
  const back = within(band).getByRole('button', { name: '戻る' })
  const shown = group.getBoundingClientRect()

  await expect(group).toHaveTextContent(`${STATION}Hybridcast`)
  await expect(close).toHaveTextContent('閉じる')
  await expect(named(band)).toEqual(['Hybridcast を閉じる', ...KEYS])
  await fingerSized(band)
  await near(
    shown.left,
    band.getBoundingClientRect().left +
      parseFloat(getComputedStyle(band).paddingLeft),
  )
  await expect(
    back.getBoundingClientRect().left - close.getBoundingClientRect().right,
  ).toBeGreaterThanOrEqual(MOCK.gap * u - 0.6)
  await cutOnlyWithoutRoom(band, u)
  await near(
    close.getBoundingClientRect().top,
    back.getBoundingClientRect().top,
  )

  await userEvent.click(close)
  await expect(
    within(band).queryByRole('group', { name: 'Hybridcast' }),
  ).toBeNull()
  await expect(named(band)).toEqual(KEYS)
}

async function nameWhole(canvasElement: HTMLElement, place: StripPlace) {
  const { band, u } = await asTheMock(canvasElement, place)
  const { cut } = await cutOnlyWithoutRoom(band, u)

  await expect(cut).toBe(false)
}

export const 帯_Hybridcast_PC: Story = {
  parameters: { screen: { width: 1600, height: 1000 } },
  render: () => <Band place="under" numbers={false} station={STATION} />,
  play: async ({ canvasElement }) => {
    await nameWhole(canvasElement, 'under')
    await withTheApplication(canvasElement, 'under')
  },
}

export const 帯_Hybridcast_iPad_窓: Story = {
  parameters: { screen: { width: 820, height: 1180 } },
  render: () => <Band place="under" numbers={false} station={STATION} />,
  play: async ({ canvasElement }) => {
    await nameWhole(canvasElement, 'under')
    await withTheApplication(canvasElement, 'under')
  },
}

export const 帯_Hybridcast_iPad_全画面: Story = {
  parameters: { screen: { width: 1180, height: 820 } },
  render: () => <Band place="over" numbers={false} station={STATION} />,
  play: async ({ canvasElement }) => {
    await nameWhole(canvasElement, 'over')
    await withTheApplication(canvasElement, 'over')
  },
}

export const 帯_Hybridcast_PC_全画面: Story = {
  parameters: { screen: { width: 1600, height: 1000 } },
  render: () => <Band place="over" numbers={false} station={STATION} />,
  play: async ({ canvasElement }) => {
    await nameWhole(canvasElement, 'over')
    await withTheApplication(canvasElement, 'over')
  },
}

const LONG_STATION = 'とても長い名前の放送局のチャンネル第一テレビジョン'

/** A long station's name: cut short where the keys leave no room for it, as on a finger's window, with `Hybridcast` whole under it and `閉じる` one gap from `戻る`; whole where there is room, as in fullscreen and on a wide player. */
async function longName(
  canvasElement: HTMLElement,
  place: StripPlace,
  cut: boolean,
) {
  const { band, u } = await asTheMock(canvasElement, place)
  const found = await cutOnlyWithoutRoom(band, u)

  await expect(found.cut).toBe(cut)
  await expect(named(band)).toEqual(['Hybridcast を閉じる', ...KEYS])
  await fingerSized(band)
}

export const 帯_Hybridcast_長い局名: Story = {
  parameters: { screen: { width: 820, height: 1180 } },
  render: () => <Band place="under" numbers={false} station={LONG_STATION} />,
  play: async ({ canvasElement }) => {
    await longName(canvasElement, 'under', true)
  },
}

export const 帯_Hybridcast_長い局名_iPad_全画面: Story = {
  parameters: { screen: { width: 1180, height: 820 } },
  render: () => <Band place="over" numbers={false} station={LONG_STATION} />,
  play: async ({ canvasElement }) => {
    await longName(canvasElement, 'over', false)
  },
}

export const 帯_Hybridcast_長い局名_PC: Story = {
  parameters: { screen: { width: 2400, height: 1200 } },
  render: () => <Band place="under" numbers={false} station={LONG_STATION} />,
  play: async ({ canvasElement }) => {
    await longName(canvasElement, 'under', false)
  },
}

function Reloaded() {
  const [readies, setReadies] = useState(0)
  const [error, setError] = useState<string | null>(null)

  return (
    <div
      className="p-6"
      role="group"
      aria-label="読み込み直した枠"
      data-readies={readies}
      data-error={error ?? undefined}
    >
      <div className={cn(PLAYER_FACE, 'relative w-96')}>
        <BmlFrame
          onReady={(send) => {
            setReadies((before) => before + 1)
            send({ kind: 'catalog', catalog: DATA_BROADCAST_CATALOG })
          }}
          onMessage={(message) => {
            if (message.kind === 'error') {
              setError(message.reason)
            }
          }}
        />
      </div>
    </div>
  )
}

export const 読み込み直した枠は壊れたものとして閉じる: Story = {
  render: () => <Reloaded />,
  play: async ({ canvasElement }) => {
    const group = within(canvasElement).getByRole('group', {
      name: '読み込み直した枠',
    })
    const frame = canvasElement.querySelector('iframe') as HTMLIFrameElement

    await waitFor(() => expect(group).toHaveAttribute('data-readies', '1'), {
      timeout: 5000,
    })
    await expect(group).not.toHaveAttribute('data-error')

    frame.setAttribute('srcdoc', '<!doctype html><p>another page</p>')

    await waitFor(
      () => expect(group).toHaveAttribute('data-error', 'malformed'),
      {
        timeout: 5000,
      },
    )
    await expect(group).toHaveAttribute('data-readies', '1')
  },
}
