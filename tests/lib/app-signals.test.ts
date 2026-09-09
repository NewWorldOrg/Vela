import assert from 'node:assert/strict'
import { mock, test, type TestContext } from 'node:test'

import { RECONNECT_MS, SignalWatch } from '@/lib/app-signals'
import {
  ENCODE_JOBS_EVENT,
  QUALITY_EVENT,
  RECORDINGS_EVENT,
  RESERVATIONS_EVENT,
} from '@/repository/events'

const DEBOUNCE_MS = 200

let streams: TestStream[] = []

class TestStream {
  static readonly CLOSED = 2

  readyState = 0

  onerror: (() => void) | null = null

  closed = false

  readonly url: string

  private readonly heeded = new Map<string, () => void>()

  constructor(url: string) {
    this.url = url
    streams.push(this)
  }

  addEventListener(name: string, given: () => void): void {
    this.heeded.set(name, given)
  }

  close(): void {
    this.readyState = TestStream.CLOSED
    this.closed = true
  }

  get heeding(): string[] {
    return [...this.heeded.keys()]
  }

  say(name: string): void {
    const given = this.heeded.get(name)

    assert.ok(given, `nothing is listening for '${name}'`)
    given()
  }

  drop(): void {
    this.readyState = TestStream.CLOSED
    this.onerror?.()
  }
}

function settled(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

function watching(t: TestContext, { hub = 200 } = {}) {
  streams = []
  mock.timers.enable({ apis: ['setTimeout'] })

  const trueStream = globalThis.EventSource
  const trueFetch = globalThis.fetch
  const refreshes: number[] = []
  let ended = 0

  Object.assign(globalThis, {
    EventSource: TestStream,
    fetch: async () => new Response(null, { status: hub }),
  })

  const watch = new SignalWatch(
    [RECORDINGS_EVENT, ENCODE_JOBS_EVENT, QUALITY_EVENT],
    () => refreshes.push(refreshes.length),
    () => {
      ended += 1
    },
  )

  t.after(() => {
    watch.close()
    mock.timers.reset()
    Object.assign(globalThis, { EventSource: trueStream, fetch: trueFetch })
  })

  watch.listen()

  return {
    watch,
    refreshes: () => refreshes.length,
    ended: () => ended,
    stream: () => streams[streams.length - 1],
    streams: () => streams.length,
  }
}

test('a screen hears only the kinds it asked for', (t) => {
  const stand = watching(t)

  assert.deepEqual(stand.stream().heeding, [
    RECORDINGS_EVENT,
    ENCODE_JOBS_EVENT,
    QUALITY_EVENT,
  ])
  assert.equal(stand.stream().url, '/api/events')
})

test('signals arriving one after another are taken up once', (t) => {
  const stand = watching(t)

  stand.stream().say(RECORDINGS_EVENT)
  stand.stream().say(ENCODE_JOBS_EVENT)
  stand.stream().say(QUALITY_EVENT)

  mock.timers.tick(DEBOUNCE_MS - 1)
  assert.equal(stand.refreshes(), 0)

  mock.timers.tick(1)
  assert.equal(stand.refreshes(), 1)
})

test('signals far enough apart are each taken up', (t) => {
  const stand = watching(t)

  stand.stream().say(RECORDINGS_EVENT)
  mock.timers.tick(DEBOUNCE_MS)

  stand.stream().say(RECORDINGS_EVENT)
  mock.timers.tick(DEBOUNCE_MS)

  assert.equal(stand.refreshes(), 2)
})

test('a signal not asked for is never heard at all', (t) => {
  const stand = watching(t)

  assert.equal(stand.stream().heeding.includes(RESERVATIONS_EVENT), false)
})

test('a screen that goes away leaves nothing listening', (t) => {
  const stand = watching(t)

  stand.stream().say(RECORDINGS_EVENT)
  stand.watch.close()

  mock.timers.tick(DEBOUNCE_MS)

  assert.equal(stand.stream().closed, true)
  assert.equal(stand.refreshes(), 0)
})

test('a stream that drops while the session stands is taken up again', async (t) => {
  const stand = watching(t)

  stand.stream().drop()
  await settled()

  assert.equal(stand.streams(), 1)

  mock.timers.tick(RECONNECT_MS)

  assert.equal(stand.streams(), 2)
  assert.equal(stand.ended(), 0)

  stand.stream().say(QUALITY_EVENT)
  mock.timers.tick(DEBOUNCE_MS)

  assert.equal(stand.refreshes(), 1)
})

test('a stream the hub refuses says the session ended and stops', async (t) => {
  const stand = watching(t, { hub: 401 })

  stand.stream().drop()
  await settled()

  mock.timers.tick(RECONNECT_MS)

  assert.equal(stand.ended(), 1)
  assert.equal(stand.streams(), 1)
})

test('a screen that goes away while the hub is being asked stays away', async (t) => {
  const stand = watching(t, { hub: 401 })

  stand.stream().drop()
  stand.watch.close()
  await settled()

  mock.timers.tick(RECONNECT_MS)

  assert.equal(stand.ended(), 0)
  assert.equal(stand.streams(), 1)
})
