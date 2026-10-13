import { useEffect, useRef, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import type { BmlKey } from '@/lib/bml/keys'
import { memoryKey } from '@/lib/bml/memory'
import { DataBroadcastFeed } from '@/lib/data-broadcast-feed'
import { EVERYTHING, type BoundaryPair } from '@/lib/hybridcast/boundary'
import type { EventInformation } from '@/lib/hybridcast/event-information'
import { KEY_SET_UNTIL_TOLD } from '@/lib/hybridcast/keys'
import type { OwnedApplication } from '@/lib/hybridcast/messages'
import { cn } from '@/lib/utils'
import {
  HYBRIDCAST_FRAME_TITLE,
  HYBRIDCAST_SANDBOX,
  HybridcastFace,
  OPENED_WITHIN_MS,
  type AppHeard,
  type SendToApp,
} from '@/components/data-broadcast/hybridcast-frame'
import {
  PLAYER_BOARD,
  PLAYER_FACE,
} from '@/components/recordings/player-palette'

const meta = {
  title: 'Components/Hybridcast',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const AIT = 'http://example.test/hc/app.ait'

const ENTRY = 'http://example.test/hc/index.html'

/** The self-made application, served beside the stories in place of the relay: the address the frame opens, as Carina's would be, the relay's path and the broadcaster's URL in `uri`. */
const AT_THE_APP = `/hybridcast-app/app.html?uri=${encodeURIComponent(ENTRY)}`

const SERVICE = 1027

function boundaryOf(bitmap: number): BoundaryPair[] {
  return [{ permissionBitmap: bitmap, managedUrls: ['http://example.test'] }]
}

function application(boundary: BoundaryPair[]): OwnedApplication {
  return {
    ait: AIT,
    orgId: 16,
    appId: 1,
    controlCode: 1,
    entryUrl: ENTRY,
    boundary,
  }
}

const PROGRAMME: EventInformation = {
  networkId: 32736,
  serviceId: SERVICE,
  now: {
    eventId: 0x1234,
    startsAt: Date.parse('2026-10-14T12:00:00Z'),
    duration: 1800,
    name: '見本の番組',
    description: '',
  },
  next: null,
}

const GREG = Array.from({ length: 64 }, (_, at) => (at === 44 ? 'back' : ''))

const KEYS: [BmlKey, string][] = [
  ['red', '赤'],
  ['enter', '決定'],
  ['blue', '青'],
  ['0', '0'],
  ['1', '1'],
  ['2', '2'],
  ['3', '3'],
  ['4', '4'],
  ['5', '5'],
  ['d', 'd'],
]

function heardAs(message: AppHeard): string {
  switch (message.kind) {
    case 'lost':
      return message.end.why === 'unopened' ? 'lost:unopened' : 'lost'
    case 'videoRect':
      return `videoRect:${message.over ? 'over' : 'under'}`
    default:
      return message.kind
  }
}

/** The application's frame over a player's box, with the keys of the remote beside it, reporting what the self-made application was answered and what the player heard of it. */
function Harness({
  label,
  address = AT_THE_APP,
  boundary = boundaryOf(EVERYTHING),
}: {
  label: string
  address?: string
  boundary?: BoundaryPair[]
}) {
  const [feed] = useState(() => new DataBroadcastFeed())
  const [report, setReport] = useState<Record<string, string>>({})
  const [heard, setHeard] = useState<AppHeard[]>([])
  const send = useRef<SendToApp | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const [player, setPlayer] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    const listen = (event: MessageEvent) => {
      const frame = box.current?.querySelector('iframe')
      const probe = (event.data as { probe?: Record<string, string> } | null)
        ?.probe

      if (!frame || event.source !== frame.contentWindow || !probe) {
        return
      }

      setReport({ ...probe })
    }

    window.addEventListener('message', listen)

    return () => window.removeEventListener('message', listen)
  }, [])

  const rect = heard.findLast((message) => message.kind === 'videoRect')

  return (
    <div
      className="flex flex-col gap-4 p-6"
      role="group"
      aria-label={label}
      data-heard={heard.map(heardAs).join(',')}
      data-rect={
        rect?.kind === 'videoRect' && rect.rect
          ? Object.values(rect.rect).join(',')
          : undefined
      }
      {...Object.fromEntries(
        Object.entries(report).map(([name, value]) => [`data-${name}`, value]),
      )}
    >
      <div
        ref={setPlayer}
        tabIndex={-1}
        data-slot="player"
        className={cn(PLAYER_BOARD, 'max-w-[720px] outline-none')}
      >
        <div ref={box} className={cn(PLAYER_FACE, 'relative bg-black')}>
          <HybridcastFace
            app={{
              start: { ait: AIT, orgId: 16, appId: 1 },
              nth: 1,
              address,
              application: application(boundary),
            }}
            feed={feed}
            service={SERVICE}
            programme={PROGRAMME}
            receiverId={{ caSystemId: 5, cardId: '0123456789AB' }}
            greg={GREG}
            keysTo={player}
            onHeard={(message) => setHeard((was) => [...was, message])}
            onSender={(sender) => {
              send.current = sender
            }}
          />
        </div>
      </div>
      <div className="flex gap-2">
        {KEYS.map(([key, name]) => (
          <button
            key={key}
            type="button"
            className="h-11 min-w-11 cursor-pointer rounded-full border border-line px-4 text-ui"
            onClick={() => send.current?.({ kind: 'key', key })}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  )
}

function group(canvasElement: HTMLElement, name: string): HTMLElement {
  return within(canvasElement).getByRole('group', { name })
}

async function reported(on: HTMLElement, name: string, value?: string) {
  await waitFor(
    () =>
      value === undefined
        ? expect(on).toHaveAttribute(`data-${name}`)
        : expect(on).toHaveAttribute(`data-${name}`, value),
    { timeout: 5000 },
  )
}

function frameIn(on: HTMLElement): HTMLIFrameElement {
  const frame = on.querySelector('iframe')

  if (!frame) {
    throw new Error('the application has no frame')
  }

  return frame
}

export const 受信機の関数: Story = {
  render: () => <Harness label="受信機の関数" />,
  play: async ({ canvasElement }) => {
    const app = group(canvasElement, '受信機の関数')
    const frame = frameIn(app)

    await expect(frame).toHaveAttribute('sandbox', HYBRIDCAST_SANDBOX)
    await expect(frame).toHaveAttribute('title', HYBRIDCAST_FRAME_TITLE)
    await reported(app, 'image')
    await reported(app, 'device', '0123456789AB')

    await expect(app).toHaveAttribute('data-agent', 'hybridcast')
    await expect(app).toHaveAttribute('data-agent-maker', '1')
    await expect(app).toHaveAttribute('data-name', '')
    await expect(app).toHaveAttribute('data-vk', '13,38,403,496,48')
    await expect(app).toHaveAttribute('data-system', '|Vela|Vela|1.0.0')
    await expect(app).toHaveAttribute('data-event', '1027|4660|見本の番組|true')
    await expect(app).toHaveAttribute('data-onair', 'true')
    await expect(app).toHaveAttribute('data-greg44', 'back')
    await expect(app).toHaveAttribute('data-greg61', '')
    await expect(app).toHaveAttribute('data-memory', 'abc')
    await expect(app).toHaveAttribute('data-tune', 'false')
    await expect(app).toHaveAttribute('data-companion', 'null')
    await expect(app).toHaveAttribute('data-ait', '[16,1]')
    await expect(app).toHaveAttribute('data-keyset', String(KEY_SET_UNTIL_TOLD))
    await expect(
      window.localStorage.getItem(memoryKey(SERVICE, 'nvram://~/local/sample')),
    ).not.toBeNull()
    await waitFor(() =>
      expect(app.getAttribute('data-heard')).toContain('greg'),
    )
    await expect(app.getAttribute('data-heard')).toContain('keySet')
    await expect(app).toHaveAttribute('data-rect', '960,120,800,450')
    await expect(app.getAttribute('data-heard')).toContain('videoRect:over')
  },
}

export const 届かないもの: Story = {
  render: () => <Harness label="アプリから届かないもの" />,
  play: async ({ canvasElement }) => {
    const app = group(canvasElement, 'アプリから届かないもの')

    await reported(app, 'image')
    await reported(app, 'api')
    await reported(app, 'xhr-outside')
    await reported(app, 'outside')

    await expect(app).toHaveAttribute('data-origin', 'null')
    await expect(app).toHaveAttribute('data-cookie', 'SecurityError')
    await expect(app).toHaveAttribute('data-storage', 'SecurityError')
    await expect(app).toHaveAttribute('data-parent', 'SecurityError')
    await reported(app, 'xhr')
    await expect(app).toHaveAttribute('data-api', 'relayed')
    await expect(app).toHaveAttribute('data-fetch', 'relayed')
    await expect(app).toHaveAttribute('data-xhr', 'relayed')
    await expect(app).toHaveAttribute('data-xhr-credentials', 'false')
    await expect(app).toHaveAttribute('data-outside', 'TypeError')
    await expect(app).toHaveAttribute('data-xhr-outside', 'error 4 0')
    await expect(app).toHaveAttribute('data-socket', 'relayed')
    await expect(app).toHaveAttribute('data-socket-outside', 'SecurityError')
    await expect(app).toHaveAttribute('data-image', 'relayed')
  },
}

export const キー: Story = {
  render: () => <Harness label="キー" />,
  play: async ({ canvasElement }) => {
    const app = group(canvasElement, 'キー')
    const canvas = within(app)

    await reported(app, 'keyset')
    await waitFor(() =>
      expect(app.getAttribute('data-heard')).toContain('keySet'),
    )
    await userEvent.click(canvas.getByRole('button', { name: 'd' }))
    await userEvent.click(canvas.getByRole('button', { name: '赤' }))

    await reported(app, 'keys', '403')
  },
}

export const 中継の中の別のページへ移る: Story = {
  render: () => <Harness label="中継の中の別のページ" />,
  play: async ({ canvasElement }) => {
    const app = group(canvasElement, '中継の中の別のページ')

    await reported(app, 'keyset')
    await waitFor(() =>
      expect(app.getAttribute('data-heard')).toContain('keySet'),
    )
    await userEvent.click(within(app).getByRole('button', { name: '決定' }))

    await reported(app, 'page', 'next')
    await expect(app).toHaveAttribute('data-greg61', 'app:1')
    await expect(app).toHaveAttribute('data-memory', 'abc')
    await new Promise((resolve) => setTimeout(resolve, OPENED_WITHIN_MS + 200))
    await expect(app.getAttribute('data-heard')).not.toContain('lost')
  },
}

export const 中継の外へは移らない: Story = {
  render: () => <Harness label="中継の外へ移ろうとする" />,
  play: async ({ canvasElement }) => {
    const app = group(canvasElement, '中継の外へ移ろうとする')

    await reported(app, 'keyset')
    await waitFor(() =>
      expect(app.getAttribute('data-heard')).toContain('keySet'),
    )
    await userEvent.click(within(app).getByRole('button', { name: '青' }))

    await reported(app, 'escape', 'stayed')
    await expect(app).toHaveAttribute('data-page', 'index')
    await expect(app.getAttribute('data-heard')).not.toContain('lost')
  },
}

export const 中継の外へ出た枠は閉じる: Story = {
  render: () => <Harness label="中継の外へ出た枠" />,
  play: async ({ canvasElement }) => {
    const app = group(canvasElement, '中継の外へ出た枠')

    await reported(app, 'loaded', 'yes')
    await waitFor(() =>
      expect(app.getAttribute('data-heard')).toContain('keySet'),
    )
    await userEvent.click(within(app).getByRole('button', { name: '0' }))

    await waitFor(
      () =>
        expect(app.getAttribute('data-heard')?.split(',')).toContain('lost'),
      { timeout: OPENED_WITHIN_MS + 3000 },
    )
  },
}

export const 外から中継の外へ移された枠は閉じる: Story = {
  render: () => <Harness label="外から移された枠" />,
  play: async ({ canvasElement }) => {
    const app = group(canvasElement, '外から移された枠')

    await reported(app, 'keyset')
    frameIn(app).contentWindow?.location.replace('/hybridcast-app/outside.html')

    await waitFor(
      () => expect(app.getAttribute('data-heard')).toMatch(/lost/),
      { timeout: OPENED_WITHIN_MS + 3000 },
    )
  },
}

export const 中継に載らなかった枠は開けない: Story = {
  render: () => (
    <Harness
      label="中継に載らなかった枠"
      address={`/hybridcast-app/outside.html?uri=${encodeURIComponent(ENTRY)}`}
    />
  ),
  play: async ({ canvasElement }) => {
    const app = group(canvasElement, '中継に載らなかった枠')

    await waitFor(
      () => expect(app).toHaveAttribute('data-heard', 'lost:unopened'),
      { timeout: OPENED_WITHIN_MS + 3000 },
    )
  },
}

export const 映像の上に描けないアプリ: Story = {
  render: () => (
    <Harness
      label="映像の上に描けないアプリ"
      boundary={boundaryOf(0x2000 | (1 << 12) | (1 << 5))}
    />
  ),
  play: async ({ canvasElement }) => {
    const app = group(canvasElement, '映像の上に描けないアプリ')

    await waitFor(() =>
      expect(app.getAttribute('data-heard')).toContain('videoRect:under'),
    )
    await expect(app).toHaveAttribute('data-rect', '960,120,800,450')
    await waitFor(() =>
      expect(getComputedStyle(frameIn(app)).maskImage).toContain('gradient'),
    )
  },
}

function playerIn(on: HTMLElement): HTMLElement {
  return on.querySelector('[data-slot="player"]') as HTMLElement
}

export const 枠はフォーカスを持たない: Story = {
  render: () => <Harness label="枠のフォーカス" />,
  play: async ({ canvasElement }) => {
    const app = group(canvasElement, '枠のフォーカス')
    const player = playerIn(app)

    await reported(app, 'loaded', 'yes')
    frameIn(app).focus()
    await waitFor(() => expect(document.activeElement).toBe(player))

    await userEvent.click(within(app).getByRole('button', { name: '1' }))
    await reported(app, 'field')
    await waitFor(() => expect(document.activeElement).toBe(player))
  },
}

export const 識別子を拒む組のあるバウンダリ: Story = {
  render: () => (
    <Harness
      label="識別子を拒む組のあるバウンダリ"
      boundary={[
        ...boundaryOf(EVERYTHING),
        {
          permissionBitmap: 0x2000 | (1 << 5),
          managedUrls: ['http://other.example.test'],
        },
      ]}
    />
  ),
  play: async ({ canvasElement }) => {
    const app = group(canvasElement, '識別子を拒む組のあるバウンダリ')

    await reported(app, 'device', 'null')
    await expect(app).toHaveAttribute('data-system', '|Vela|Vela|1.0.0')
  },
}

export const 挨拶をし直して中継の外へ出た枠も閉じる: Story = {
  render: () => <Harness label="挨拶をし直した枠" />,
  play: async ({ canvasElement }) => {
    const app = group(canvasElement, '挨拶をし直した枠')

    await reported(app, 'loaded', 'yes')
    await waitFor(() =>
      expect(app.getAttribute('data-heard')).toContain('keySet'),
    )
    await userEvent.click(within(app).getByRole('button', { name: '2' }))

    await waitFor(
      () =>
        expect(app.getAttribute('data-heard')?.split(',')).toContain('lost'),
      { timeout: OPENED_WITHIN_MS + 3000 },
    )
  },
}

export const 局の場所を読む: Story = {
  render: () => <Harness label="局の場所" />,
  play: async ({ canvasElement }) => {
    const app = group(canvasElement, '局の場所')

    await reported(app, 'composed')
    await reported(app, 'xhr')

    await expect(app).toHaveAttribute('data-hostname', 'example.test')
    await expect(app).toHaveAttribute(
      'data-av-type',
      'video/x-iptvf-broadcast|video/x-iptvf-broadcast',
    )
    await expect(app).toHaveAttribute('data-made-type', 'video/broadcast|false')
    await expect(app).toHaveAttribute('data-href', ENTRY)
    await expect(app).toHaveAttribute('data-composed', 'relayed')
    await expect(app).toHaveAttribute(
      'data-xhr-at',
      'http://example.test/hc/data.json',
    )
    await expect(app).toHaveAttribute('data-xhr', 'relayed')
  },
}

async function movedBy(canvasElement: HTMLElement, label: string, key: string) {
  const app = group(canvasElement, label)

  await reported(app, 'loaded', 'yes')
  await waitFor(() =>
    expect(app.getAttribute('data-heard')).toContain('keySet'),
  )
  await userEvent.click(within(app).getByRole('button', { name: key }))

  await reported(app, 'page', 'next')
  await reported(app, 'xhr')
  await expect(app).toHaveAttribute(
    'data-href',
    'http://example.test/hc/sub/next.html',
  )
  await expect(app).toHaveAttribute(
    'data-xhr-at',
    'http://example.test/hc/sub/data.json',
  )
  await expect(app).toHaveAttribute('data-xhr', 'relayed')
  await new Promise((resolve) => setTimeout(resolve, OPENED_WITHIN_MS + 200))
  await expect(app.getAttribute('data-heard')).not.toContain('lost')
}

export const 局の場所の_href_で移る: Story = {
  render: () => <Harness label="href で移る" />,
  play: async ({ canvasElement }) => movedBy(canvasElement, 'href で移る', '3'),
}

export const 局の場所を代入して移る: Story = {
  render: () => <Harness label="代入で移る" />,
  play: async ({ canvasElement }) => movedBy(canvasElement, '代入で移る', '5'),
}

export const 局の場所でバウンダリの外へ出ると閉じる: Story = {
  render: () => <Harness label="局の場所で外へ" />,
  play: async ({ canvasElement }) => {
    const app = group(canvasElement, '局の場所で外へ')

    await reported(app, 'loaded', 'yes')
    await waitFor(() =>
      expect(app.getAttribute('data-heard')).toContain('keySet'),
    )
    await userEvent.click(within(app).getByRole('button', { name: '4' }))

    await waitFor(() =>
      expect(app.getAttribute('data-heard')?.split(',')).toContain('lost'),
    )
    await expect(app).toHaveAttribute('data-page', 'index')
  },
}

export const 読み込みの前に次のページへ移る入口: Story = {
  render: () => (
    <Harness
      label="読み込みの前に移る入口"
      address={`/hybridcast-app/app.html?uri=${encodeURIComponent(`${ENTRY}?jump`)}`}
    />
  ),
  play: async ({ canvasElement }) => {
    const app = group(canvasElement, '読み込みの前に移る入口')

    await reported(app, 'page', 'next')
    await reported(app, 'loaded', 'yes')
    await new Promise((resolve) => setTimeout(resolve, OPENED_WITHIN_MS + 500))
    await expect(app.getAttribute('data-heard')).not.toContain('lost')
  },
}
