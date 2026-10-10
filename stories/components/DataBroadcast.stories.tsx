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
