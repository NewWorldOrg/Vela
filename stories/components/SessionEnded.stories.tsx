import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, waitFor, within } from 'storybook/test'

import { GuideLive, RECONNECT_MS } from '@/components/guide/guide-live'

const ENDED = 'セッションが切れました。'

let streams: TestStream[] = []

let retries: Array<() => void> = []

class TestStream {
  static readonly CLOSED = 2

  readyState = 0

  onerror: (() => void) | null = null

  closed = false

  constructor(public readonly url: string) {
    streams.push(this)
  }

  addEventListener(): void {}

  removeEventListener(): void {}

  close(): void {
    this.readyState = TestStream.CLOSED
    this.closed = true
  }

  drop(): void {
    this.readyState = TestStream.CLOSED
    this.onerror?.()
  }
}

function hubAnswering(status: number) {
  return () => {
    streams = []
    retries = []

    const trueStream = window.EventSource
    const trueFetch = window.fetch
    const trueSetTimeout = window.setTimeout

    window.EventSource = TestStream as unknown as typeof EventSource
    window.fetch = (async () => new Response(null, { status })) as typeof fetch
    window.setTimeout = ((
      handler: TimerHandler,
      delay?: number,
      ...rest: unknown[]
    ) => {
      if (delay === RECONNECT_MS) {
        retries.push(handler as () => void)

        return 0
      }

      return trueSetTimeout(handler, delay, ...rest)
    }) as typeof window.setTimeout

    return () => {
      window.EventSource = trueStream
      window.fetch = trueFetch
      window.setTimeout = trueSetTimeout
    }
  }
}

async function theStream(): Promise<TestStream> {
  await waitFor(() => expect(streams).toHaveLength(1))

  return streams[0]
}

const meta = {
  title: 'Components/セッション切れ',
  component: GuideLive,
  parameters: {
    layout: 'fullscreen',
    nextjs: { appDirectory: true, navigation: { pathname: '/guide' } },
  },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-[820px] py-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GuideLive>

export default meta
type Story = StoryObj<typeof meta>

export const 番組表: Story = {
  beforeEach: hubAnswering(401),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const stream = await theStream()

    stream.drop()

    await waitFor(() => canvas.getByText(ENDED))

    await expect(stream.closed).toBe(true)
    await expect(retries).toHaveLength(0)
    await expect(streams).toHaveLength(1)
    await expect(
      canvas.getByRole('link', { name: 'ログイン' }),
    ).toHaveAttribute('href', '/login?next=%2Fguide')
  },
}

export const 絞り込んだ番組表: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/guide',
        query: { kind: 'bs', date: '2026-08-19' },
      },
    },
  },
  beforeEach: hubAnswering(401),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const stream = await theStream()

    stream.drop()

    await waitFor(() => canvas.getByText(ENDED))

    await expect(
      canvas.getByRole('link', { name: 'ログイン' }),
    ).toHaveAttribute(
      'href',
      '/login?next=%2Fguide%3Fkind%3Dbs%26date%3D2026-08-19',
    )
  },
}

export const 瞬断: Story = {
  beforeEach: hubAnswering(503),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const stream = await theStream()

    stream.drop()

    await waitFor(() => expect(retries).toHaveLength(1))

    retries[0]()

    await waitFor(() => expect(streams).toHaveLength(2))

    await expect(canvas.queryByText(ENDED)).toBeNull()
  },
}
