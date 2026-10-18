import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'

import {
  openLiveSession,
  type LiveSessionEvents,
  type LiveSocket,
} from '@/components/live/live-session'
import {
  WIRE_KEPT_AHEAD_MS,
  holdWireProfile,
  openWireAhead,
  takeWireAhead,
  wireProfileInUse,
} from '@/components/live/live-wire-ahead'
import { frameOf, readControl, readFrame } from '@/lib/live-wire'

const CONNECTING = 0

const OPEN = 1

const CLOSED = 3

const HERE = '/api/live/ws?network=1&service=2&profile=1080p60&sound=main'

const THERE = '/api/live/ws?network=1&service=3&profile=1080p60&sound=main'

class Wire implements LiveSocket {
  binaryType: BinaryType = 'blob'

  readyState = CONNECTING

  onopen: ((event: Event) => void) | null = null

  onmessage: ((event: MessageEvent) => void) | null = null

  onclose: ((event: CloseEvent) => void) | null = null

  onerror: ((event: Event) => void) | null = null

  readonly sent: Uint8Array[] = []

  closedWith: number | null = null

  readonly href: string

  constructor(href: string) {
    this.href = href
  }

  send(data: ArrayBuffer | ArrayBufferView): void {
    this.sent.push(new Uint8Array(data as ArrayBuffer))
  }

  close(code?: number): void {
    this.readyState = CLOSED
    this.closedWith = code ?? 1000
  }

  opens(): void {
    this.readyState = OPEN
    this.onopen?.({} as Event)
  }

  carries(pts: number): void {
    this.onmessage?.({
      data: frameOf('picture', pts, new Uint8Array([pts])).slice().buffer,
    } as MessageEvent)
  }

  drops(code: number): void {
    this.readyState = CLOSED
    this.onclose?.({ code } as CloseEvent)
  }
}

function wires(context: TestContext) {
  context.mock.timers.enable({ apis: ['setTimeout'] })

  const opened: Wire[] = []
  const open = (href: string) => {
    const wire = new Wire(href)

    opened.push(wire)

    return wire
  }

  context.after(() => {
    takeWireAhead(HERE)
    takeWireAhead(THERE)
  })

  return { opened, open }
}

async function handedOn() {
  await Promise.resolve()
  await Promise.resolve()
}

function saidLeaving(wire: Wire): boolean {
  return wire.sent.some((bytes) => {
    const frame = readFrame(bytes)

    return (
      frame?.channel === 'control' &&
      readControl(frame.payload).said === 'leaving'
    )
  })
}

test('a wire opened ahead is handed over once, and only for its own address', (context) => {
  const { opened, open } = wires(context)

  openWireAhead(HERE, open)

  assert.equal(opened.length, 1)
  assert.equal(opened[0].href, HERE)
  assert.equal(opened[0].binaryType, 'arraybuffer')
  assert.equal(takeWireAhead(THERE), undefined)
  assert.notEqual(takeWireAhead(HERE), undefined)
  assert.equal(takeWireAhead(HERE), undefined)
})

test('what a wire hears before it is taken is handed on in order once it is', async (context) => {
  const { opened, open } = wires(context)
  const heard: string[] = []

  openWireAhead(HERE, open)
  opened[0].opens()
  opened[0].carries(1)
  opened[0].carries(2)
  opened[0].drops(1006)

  const taken = takeWireAhead(HERE)!

  taken.onmessage = (event) =>
    heard.push(`picture ${readFrame(new Uint8Array(event.data))!.pts}`)
  taken.onclose = (event) => heard.push(`closed ${event.code}`)
  await handedOn()

  assert.deepEqual(heard, ['picture 1', 'picture 2', 'closed 1006'])
})

test('a wire taken before it hears anything hands on what it hears as it hears it', async (context) => {
  const { opened, open } = wires(context)
  const heard: number[] = []

  openWireAhead(HERE, open)

  const taken = takeWireAhead(HERE)!

  taken.onmessage = (event) =>
    heard.push(readFrame(new Uint8Array(event.data))!.pts)
  opened[0].opens()
  opened[0].carries(7)
  await handedOn()

  assert.deepEqual(heard, [7])
  assert.equal(taken.readyState, OPEN)
})

test('a wire nobody takes in time is closed, saying it is leaving', (context) => {
  const { opened, open } = wires(context)

  openWireAhead(HERE, open)
  opened[0].opens()
  context.mock.timers.tick(WIRE_KEPT_AHEAD_MS - 1)

  assert.equal(opened[0].closedWith, null)

  context.mock.timers.tick(1)

  assert.equal(opened[0].closedWith, 1000)
  assert.ok(saidLeaving(opened[0]))
  assert.equal(takeWireAhead(HERE), undefined)
})

test('choosing another channel closes the wire opened for the one before it', (context) => {
  const { opened, open } = wires(context)

  openWireAhead(HERE, open)
  openWireAhead(THERE, open)

  assert.equal(opened[0].closedWith, 1000)
  assert.equal(opened[1].closedWith, null)
  assert.equal(takeWireAhead(HERE), undefined)
  assert.notEqual(takeWireAhead(THERE), undefined)
})

test('a wire handed over is not closed when the time it was kept for runs out', (context) => {
  const { opened, open } = wires(context)

  openWireAhead(HERE, open)
  takeWireAhead(HERE)
  context.mock.timers.tick(WIRE_KEPT_AHEAD_MS)

  assert.equal(opened[0].closedWith, null)
})

test('a session for the address takes the wire opened ahead instead of opening its own', async (context) => {
  const { opened, open } = wires(context)
  const pictures: number[] = []
  const events = {
    onHeader: () => {},
    onPicture: (_payload: Uint8Array, pts: number) => pictures.push(pts),
    onCaptionCanvas: () => {},
    onCaption: () => {},
    onDataBroadcast: () => {},
    onProgress: () => {},
    onRefusal: () => {},
    onEnding: () => {},
    onDropped: () => {},
  } satisfies LiveSessionEvents

  openWireAhead(HERE, open)
  opened[0].opens()
  opened[0].carries(3)

  const session = openLiveSession(HERE, events, open)

  await handedOn()

  assert.equal(opened.length, 1)
  assert.deepEqual(pictures, [3])

  session.leave()

  assert.equal(opened[0].closedWith, 1000)
})

test('a session for another address opens its own wire', (context) => {
  const { opened, open } = wires(context)
  const events = {
    onHeader: () => {},
    onPicture: () => {},
    onCaptionCanvas: () => {},
    onCaption: () => {},
    onDataBroadcast: () => {},
    onProgress: () => {},
    onRefusal: () => {},
    onEnding: () => {},
    onDropped: () => {},
  } satisfies LiveSessionEvents

  openWireAhead(HERE, open)

  const session = openLiveSession(THERE, events, open)

  assert.equal(opened.length, 2)
  assert.equal(opened[1].href, THERE)

  session.leave()
})

test('the profile a player uses is noted until that player lets go of it', () => {
  const lettingGoOfTheFirst = holdWireProfile('720p30')

  assert.equal(wireProfileInUse(), '720p30')

  const lettingGoOfTheSecond = holdWireProfile('1080p60')

  lettingGoOfTheFirst()

  assert.equal(wireProfileInUse(), '1080p60')

  lettingGoOfTheSecond()

  assert.equal(wireProfileInUse(), undefined)
})
