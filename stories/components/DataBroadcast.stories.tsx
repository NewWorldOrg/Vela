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
import { DataBroadcastKeypad } from '@/components/data-broadcast/data-broadcast-player'
import {
  PLAYER_BOARD,
  PLAYER_FACE,
} from '@/components/recordings/player-palette'
import {
  DATA_BROADCAST_CATALOG,
  SANDBOX_PROBE,
  dataBroadcastModules,
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

function Board({ withheld = [] }: { withheld?: number[] }) {
  const runtime = useRef<SendToRuntime | null>(null)
  const modules = useMemo(() => dataBroadcastModules(), [])
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
    send({ kind: 'catalog', catalog: DATA_BROADCAST_CATALOG })
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
    await waitFor(() =>
      expect(board).toHaveAttribute('data-unsupported', 'script'),
    )
    await expect(board).toHaveAttribute('data-video-rect', '560,60,360,203')

    await press(board, '{ArrowUp}{ArrowUp}{Enter}')
    await waitFor(() => expect(board).toHaveAttribute('data-waiting', 'true'))
    await rectIs('600,300,320,180')
    await expect(board).toHaveAttribute('data-waiting', 'false')
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

function Keypad({
  layout,
  numbers: shownFirst,
  tall = 520,
}: {
  layout: 'panel' | 'column'
  numbers: boolean
  tall?: number
}) {
  const [numbers, setNumbers] = useState(shownFirst)
  const [pressed, setPressed] = useState<string[]>([])
  const keypad = (
    <DataBroadcastKeypad
      layout={layout}
      numbers={numbers}
      onNumbers={setNumbers}
      onKey={(key) => setPressed((before) => [...before, key])}
      onAim={() => undefined}
    />
  )

  return (
    <div className="p-6" data-pressed={pressed.join(' ')}>
      {layout === 'panel' ? (
        <div>
          <div data-slot="board" className={cn(PLAYER_BOARD)}>
            <div className={cn(PLAYER_FACE, 'bg-(--pl-video)')} />
          </div>
          {keypad}
        </div>
      ) : (
        <div className="relative w-[400px] bg-black" style={{ height: tall }}>
          {keypad}
        </div>
      )}
    </div>
  )
}

async function joinedUnderTheBoard(canvasElement: HTMLElement) {
  const keypad = within(canvasElement).getByRole('group', {
    name: 'データ放送のリモコン',
  })
  const board = canvasElement.querySelector(
    '[data-slot="board"]',
  ) as HTMLElement
  const panel = keypad.getBoundingClientRect()
  const box = board.getBoundingClientRect()

  await expect(panel.top).toBe(box.bottom - 1)
  await expect(
    Math.abs(panel.left + panel.width / 2 - (box.left + box.width / 2)),
  ).toBeLessThan(1)
  await expect(panel.height).toBe(165)
  await expect(panel.width).toBeGreaterThan(380)
  await expect(panel.width).toBeLessThan(440)
  await expect(getComputedStyle(keypad).backgroundColor).toBe('rgb(21, 20, 24)')

  return keypad
}

export const キーパッド_パネル: Story = {
  parameters: { screen: { width: 1600, height: 1000 } },
  render: () => <Keypad layout="panel" numbers={false} />,
  play: async ({ canvasElement }) => {
    const keypad = await joinedUnderTheBoard(canvasElement)
    const tray = canvasElement.querySelector('[data-pressed]')

    for (const name of ['上', '右', '下', '左', '決定', '戻る', '青', '黄']) {
      await userEvent.click(within(keypad).getByRole('button', { name }))
    }

    await expect(tray).toHaveAttribute(
      'data-pressed',
      'up right down left enter back blue yellow',
    )

    for (const button of within(keypad).getAllByRole('button')) {
      const { width, height } = button.getBoundingClientRect()

      await expect(Math.min(width, height)).toBeGreaterThanOrEqual(44)
    }
  },
}

export const キーパッド_パネル_数字: Story = {
  parameters: { screen: { width: 1600, height: 1000 } },
  render: () => <Keypad layout="panel" numbers />,
  play: async ({ canvasElement }) => {
    const keypad = await joinedUnderTheBoard(canvasElement)
    const { width } = keypad.getBoundingClientRect()

    await expect(
      within(keypad)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual([
      '1',
      '2',
      '3',
      '数字を閉じる',
      '4',
      '5',
      '6',
      '0',
      '7',
      '8',
      '9',
      '決定',
    ])

    await userEvent.click(within(keypad).getByRole('button', { name: '7' }))
    await userEvent.click(within(keypad).getByRole('button', { name: '0' }))
    await expect(canvasElement.querySelector('[data-pressed]')).toHaveAttribute(
      'data-pressed',
      '7 0',
    )

    await userEvent.click(
      within(keypad).getByRole('button', { name: '数字を閉じる' }),
    )
    await expect(keypad).toHaveAttribute('data-face', 'keys')
    await expect(keypad.getBoundingClientRect().width).toBe(width)
    await expect(keypad.getBoundingClientRect().height).toBe(165)
  },
}

export const キーパッド_列: Story = {
  render: () => <Keypad layout="column" numbers={false} />,
  play: async ({ canvasElement }) => {
    const keypad = within(canvasElement).getByRole('group', {
      name: 'データ放送のリモコン',
    })

    await expect(keypad.getBoundingClientRect().width).toBe(170)
    await userEvent.click(
      within(keypad).getByRole('button', { name: '123 数字' }),
    )
    await expect(keypad).toHaveAttribute('data-face', 'numbers')
  },
}

export const キーパッド_列_数字: Story = {
  render: () => <Keypad layout="column" numbers />,
  play: async ({ canvasElement }) => {
    const keypad = within(canvasElement).getByRole('group', {
      name: 'データ放送のリモコン',
    })

    await expect(
      within(keypad)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '数字を閉じる',
      '0',
      '決定',
    ])
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

export const キーパッド_列_縦が足りない: Story = {
  render: () => <Keypad layout="column" numbers={false} tall={240} />,
  play: async ({ canvasElement }) => {
    const keypad = within(canvasElement).getByRole('group', {
      name: 'データ放送のリモコン',
    })
    const up = within(keypad).getByRole('button', { name: '上' })

    await expect(getComputedStyle(keypad).overflowY).toBe('auto')
    await expect(keypad.scrollHeight).toBeGreaterThan(keypad.clientHeight)
    await expect(
      (up.parentElement as HTMLElement).getBoundingClientRect().top,
    ).toBeGreaterThanOrEqual(keypad.getBoundingClientRect().top)

    keypad.scrollTop = keypad.scrollHeight

    const last = within(keypad).getByRole('button', { name: '123 数字' })

    await waitFor(() =>
      expect(last.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        keypad.getBoundingClientRect().bottom,
      ),
    )
  },
}
