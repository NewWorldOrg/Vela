import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, waitFor, within } from 'storybook/test'

import { GuideLive, RECONNECT_MS } from '@/components/guide/guide-live'

const ENDED = 'セッションが切れました。'

/** The streams `GuideLive` opened, in the order it opened them. */
let streams: TestStream[] = []

/** The retries `GuideLive` has scheduled and not yet run. */
let retries: Array<() => void> = []

/**
 * The stream in place of `EventSource` for the length of a story. It records
 * being opened and being closed, and `drop` is what the browser does when it
 * gives up on the connection: the state goes to CLOSED and `onerror` fires
 * without a status, which is the whole of what the screen has to go on.
 */
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

/**
 * Puts the hub behind a status of the story's choosing and holds the retry
 * timer instead of letting it run, so a retry that was scheduled is observed
 * rather than waited out — and so a story that says no retry was scheduled is
 * saying it about the timer itself rather than about the ten seconds it did
 * not sit through.
 */
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

/** The one stream on screen, once `GuideLive` has opened it. */
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

/**
 * The hub refuses the session. The stream is closed, no retry is put on the
 * clock, and the screen says so with the way back to a signed-in guide.
 */
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

/**
 * The same refusal on a guide that was filtered: the way back is the guide as
 * it was being read, query string and all, taken from the page rather than
 * handed to the banner.
 */
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

/**
 * A stream that drops while the session is still good is a blip: nothing is
 * said on screen, one retry goes on the clock, and running it opens the stream
 * again.
 */
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
