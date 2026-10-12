import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import type { Rect } from '@/lib/caption-placement'
import { keyFromKeyboard } from '@/lib/bml/keys'
import type { RuntimeMessage } from '@/lib/bml/messages'
import {
  RUNTIME_POLICY,
  RUNTIME_SANDBOX,
  runtimeDocument,
} from '@/lib/bml/runtime-document'
import { GRID } from '@/lib/bml/style'
import { cn } from '@/lib/utils'
import {
  BmlFrame,
  type SendToRuntime,
} from '@/components/data-broadcast/bml-frame'
import { fontsForTheRuntime } from '@/components/data-broadcast/bml-fonts'
import {
  DataBroadcastBand,
  type BandFit,
} from '@/components/data-broadcast/data-broadcast-player'
import {
  PLAYER_BOARD,
  PLAYER_FACE,
} from '@/components/recordings/player-palette'
import type { BmlCatalog } from '@/lib/bml/catalog'
import type { BmlModule } from '@/lib/bml/resources'
import {
  DATA_BROADCAST_CATALOG,
  SANDBOX_PROBE,
  SCRIPTED_CATALOG,
  dataBroadcastModules,
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

function Band({
  fit,
  numbers: shownFirst,
}: {
  fit: BandFit
  numbers: boolean
}) {
  const [numbers, setNumbers] = useState(shownFirst)
  const [pressed, setPressed] = useState<string[]>([])

  return (
    <div className="p-6" data-pressed={pressed.join(' ')}>
      <div data-slot="board" className={cn(PLAYER_BOARD, 'bg-(--pl-bg)')}>
        <DataBroadcastBand
          fit={fit}
          numbers={numbers}
          onNumbers={setNumbers}
          onKey={(key) => setPressed((before) => [...before, key])}
          onAim={() => undefined}
        />
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

interface Measures {
  band: number
  pill: [number, number]
  disc: number
  enter: number
  dot: number
  pitch: number
  key: number
  keyPitch: number
}

const MEASURED: Record<BandFit, Measures> = {
  fine: {
    band: 84,
    pill: [52, 40],
    disc: 72,
    enter: 32,
    dot: 32,
    pitch: 42,
    key: 40,
    keyPitch: 44,
  },
  coarse: {
    band: 120,
    pill: [60, 44],
    disc: 104,
    enter: 44,
    dot: 40,
    pitch: 48,
    key: 44,
    keyPitch: 48,
  },
  'coarse-full': {
    band: 104,
    pill: [60, 44],
    disc: 88,
    enter: 40,
    dot: 40,
    pitch: 48,
    key: 44,
    keyPitch: 48,
  },
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

/** The band as the mock draws it for this fit: its height, each key's size, and the pitch of the dots and the digits. */
async function asTheMock(canvasElement: HTMLElement, fit: BandFit) {
  const band = within(canvasElement).getByRole('group', {
    name: 'データ放送のリモコン',
  })
  const keys = within(band)
  const want = MEASURED[fit]
  const box = band.getBoundingClientRect()
  const board = (
    canvasElement.querySelector('[data-slot="board"]') as HTMLElement
  ).getBoundingClientRect()
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

  await expect(band).toHaveAttribute('data-fit', fit)
  await expect(box.height).toBe(want.band)
  await expect(box.width).toBe(board.width - 2)
  await expect(getComputedStyle(band).backgroundColor).toBe('rgb(21, 20, 24)')
  await expect([back.width, back.height]).toEqual(want.pill)
  await expect([disc.width, disc.height]).toEqual([want.disc, want.disc])
  await expect([enter.width, enter.height]).toEqual([want.enter, want.enter])
  await expect(
    Math.abs(enter.left + enter.width / 2 - (disc.left + disc.width / 2)),
  ).toBeLessThan(1)
  await expect(dots[0].querySelector('i')?.getBoundingClientRect().width).toBe(
    want.dot,
  )
  await expect(dot.height).toBe(44)
  await expect(pitchOf(dots)).toBe(want.pitch)
  await expect(
    Math.abs(disc.top + disc.height / 2 - (box.top + box.height / 2)),
  ).toBeLessThan(1)

  return band
}

async function digitsAsTheMock(band: HTMLElement, fit: BandFit) {
  const keys = within(band)
  const want = MEASURED[fit]
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
  await expect([one.width, one.height]).toEqual([want.key, want.key])
  await expect(pitchOf(digits)).toBe(want.keyPitch)
  await expect(one.left).toBeGreaterThan(toNumbers.right)

  return { digits, toNumbers }
}

export const 帯_PC: Story = {
  parameters: { screen: { width: 1600, height: 1000 } },
  render: () => <Band fit="fine" numbers={false} />,
  play: async ({ canvasElement }) => {
    const band = await asTheMock(canvasElement, 'fine')
    const tray = canvasElement.querySelector('[data-pressed]')

    await expect(named(band)).toEqual(KEYS)

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
  render: () => <Band fit="fine" numbers />,
  play: async ({ canvasElement }) => {
    const band = await asTheMock(canvasElement, 'fine')
    const { digits, toNumbers } = await digitsAsTheMock(band, 'fine')

    await expect(named(band)).toEqual([...KEYS, ...DIGITS])
    await expect(digits[0].getBoundingClientRect().top).toBe(
      toNumbers.top + (toNumbers.height - 40) / 2,
    )

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
    await expect(band.getBoundingClientRect().height).toBe(84)
  },
}

export const 帯_iPad_窓: Story = {
  parameters: { screen: { width: 820, height: 1180 } },
  render: () => <Band fit="coarse" numbers={false} />,
  play: async ({ canvasElement }) => {
    const band = await asTheMock(canvasElement, 'coarse')

    await expect(named(band)).toEqual(KEYS)

    for (const button of within(band).getAllByRole('button')) {
      if (
        ['青', '赤', '緑', '黄'].includes(
          button.getAttribute('aria-label') ?? '',
        )
      ) {
        continue
      }

      const { width, height } = button.getBoundingClientRect()

      await expect(Math.min(width, height)).toBeGreaterThanOrEqual(44)
    }
  },
}

export const 帯_iPad_窓_数字: Story = {
  parameters: { screen: { width: 820, height: 1180 } },
  render: () => <Band fit="coarse" numbers />,
  play: async ({ canvasElement }) => {
    const band = await asTheMock(canvasElement, 'coarse')
    const keys = within(band)
    const digits = DIGITS.map((name) => keys.getByRole('button', { name }))
    const one = digits[0].getBoundingClientRect()
    const blue = keys
      .getByRole('button', { name: '青' })
      .getBoundingClientRect()
    const toNumbers = keys
      .getByRole('button', { name: '123 数字' })
      .getBoundingClientRect()

    await expect(band).toHaveAttribute('data-face', 'numbers')
    await expect([one.width, one.height]).toEqual([44, 44])
    await expect(pitchOf(digits)).toBe(48)
    await expect(one.top).toBeGreaterThanOrEqual(toNumbers.bottom)
    await expect(Math.abs(one.left - blue.left)).toBeLessThan(1)
    await expect(band.getBoundingClientRect().height).toBe(120)

    await userEvent.click(keys.getByRole('button', { name: '123 数字' }))
    await expect(band).toHaveAttribute('data-face', 'keys')
    await expect(band.getBoundingClientRect().height).toBe(120)
  },
}

export const 帯_iPad_全画面: Story = {
  parameters: { screen: { width: 1180, height: 820 } },
  render: () => <Band fit="coarse-full" numbers={false} />,
  play: async ({ canvasElement }) => {
    const band = await asTheMock(canvasElement, 'coarse-full')

    await expect(named(band)).toEqual(KEYS)
  },
}

export const 帯_iPad_全画面_数字: Story = {
  parameters: { screen: { width: 1180, height: 820 } },
  render: () => <Band fit="coarse-full" numbers />,
  play: async ({ canvasElement }) => {
    const band = await asTheMock(canvasElement, 'coarse-full')
    const { digits, toNumbers } = await digitsAsTheMock(band, 'coarse-full')

    await expect(digits[0].getBoundingClientRect().top).toBe(toNumbers.top)
    await expect(band.getBoundingClientRect().height).toBe(104)
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
