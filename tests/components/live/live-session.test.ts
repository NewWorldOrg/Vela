import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'

import {
  FRESH_WIRE_AGAIN_AFTER_MS,
  FRESH_WIRE_EVERY_MS,
  openLiveSession,
  type LiveSessionEvents,
  type LiveSocket,
} from '@/components/live/live-session'
import {
  captionCanvasPayload,
  captionPayload,
  endingPayload,
  frameOf,
  progressPayload,
  refusalPayload,
  type CaptionPicture,
} from '@/lib/live-wire'

const OPEN = 1

const CLOSED = 3

const CLOSED_CLEANLY = 1000

const NO_GOODBYE = 1006

const A_FRAGMENT = 4500

const PICTURE = new Uint8Array([1, 2, 3, 4])

const CAPTION: CaptionPicture = {
  left: 10,
  top: 20,
  width: 640,
  height: 80,
  png: new Uint8Array([137, 80, 78, 71]),
}

const PING = new Uint8Array([0x01])

class Wire implements LiveSocket {
  binaryType: BinaryType = 'blob'

  readyState = OPEN

  onopen: ((event: Event) => void) | null = null

  onmessage: ((event: MessageEvent) => void) | null = null

  onclose: ((event: CloseEvent) => void) | null = null

  onerror: ((event: Event) => void) | null = null

  readonly sent: Uint8Array[] = []

  closedWith: number | null = null

  send(data: ArrayBuffer | ArrayBufferView): void {
    this.sent.push(new Uint8Array(data as ArrayBuffer))
  }

  close(code?: number): void {
    this.readyState = CLOSED
    this.closedWith = code ?? CLOSED_CLEANLY
  }

  carry(bytes: Uint8Array): void {
    this.onmessage?.({ data: bytes.buffer } as MessageEvent)
  }

  header(): void {
    this.carry(frameOf('pictureHeader', 0, new Uint8Array([0, 1])))
  }

  picture(pts: number): void {
    this.carry(frameOf('picture', pts, PICTURE))
  }

  caption(pts: number): void {
    this.carry(frameOf('caption', pts, captionPayload(CAPTION)))
  }

  control(payload: Uint8Array): void {
    this.carry(frameOf('control', 0, payload))
  }

  drop(code: number): void {
    this.readyState = CLOSED
    this.onclose?.({ code } as CloseEvent)
  }
}

function bench(context: TestContext) {
  context.mock.timers.enable({ apis: ['setTimeout'] })

  const wires: Wire[] = []
  const heard = {
    headers: [] as Uint8Array[],
    pictures: [] as number[],
    captions: [] as number[],
    canvases: 0,
    progress: 0,
    refusals: 0,
    endings: [] as string[],
    drops: [] as number[],
  }

  const events: LiveSessionEvents = {
    onHeader: (init) => heard.headers.push(init),
    onPicture: (_payload, pts) => heard.pictures.push(pts),
    onCaptionCanvas: () => {
      heard.canvases += 1
    },
    onCaption: (_picture, pts) => heard.captions.push(pts),
    onProgress: () => {
      heard.progress += 1
    },
    onRefusal: () => {
      heard.refusals += 1
    },
    onEnding: (why) => heard.endings.push(why),
    onDropped: (code) => heard.drops.push(code),
  }

  const session = openLiveSession('/api/live/ws?network=1', events, () => {
    const wire = new Wire()

    wires.push(wire)

    return wire
  })

  return { session, wires, heard }
}

function saidLeaving(wire: Wire): boolean {
  return wire.sent.some(
    (frame) => frame[0] === 0x40 && frame[9] === 0x03 && frame.length === 10,
  )
}

function saidPong(wire: Wire): boolean {
  return wire.sent.some(
    (frame) => frame[0] === 0x40 && frame[9] === 0x02 && frame.length === 10,
  )
}

test('a fresh wire is laid while the one being carried is still open', (context) => {
  const { wires } = bench(context)

  wires[0].header()
  wires[0].picture(A_FRAGMENT)

  assert.equal(wires.length, 1)

  context.mock.timers.tick(FRESH_WIRE_EVERY_MS)

  assert.equal(wires.length, 2)
  assert.equal(wires[0].closedWith, null)
  assert.equal(wires[0].readyState, OPEN)
})

test('the wire being carried is let go only once the fresh one carries a picture', (context) => {
  const { wires } = bench(context)

  wires[0].header()
  wires[0].picture(A_FRAGMENT)
  context.mock.timers.tick(FRESH_WIRE_EVERY_MS)

  wires[0].picture(A_FRAGMENT * 2)

  assert.equal(wires[0].closedWith, null)

  wires[1].picture(A_FRAGMENT * 3)

  assert.equal(wires[0].closedWith, CLOSED_CLEANLY)
  assert.equal(saidLeaving(wires[0]), true)
  assert.equal(wires[1].closedWith, null)
})

test('pictures reach the feed once each and in order while both wires are open', (context) => {
  const { wires, heard } = bench(context)

  wires[0].header()
  wires[0].picture(A_FRAGMENT)
  context.mock.timers.tick(FRESH_WIRE_EVERY_MS)

  wires[0].picture(A_FRAGMENT * 2)
  wires[1].picture(A_FRAGMENT * 2)
  wires[1].picture(A_FRAGMENT * 3)
  wires[1].picture(A_FRAGMENT * 4)

  assert.deepEqual(heard.pictures, [
    A_FRAGMENT,
    A_FRAGMENT * 2,
    A_FRAGMENT * 3,
    A_FRAGMENT * 4,
  ])
})

test('a fresh wire that arrives a fragment ahead leaves no picture behind', (context) => {
  const { wires, heard } = bench(context)

  wires[0].header()
  wires[0].picture(A_FRAGMENT)
  context.mock.timers.tick(FRESH_WIRE_EVERY_MS)

  wires[1].picture(A_FRAGMENT * 2)
  wires[0].picture(A_FRAGMENT * 2)
  wires[1].picture(A_FRAGMENT * 3)

  assert.deepEqual(heard.pictures, [A_FRAGMENT, A_FRAGMENT * 2, A_FRAGMENT * 3])
})

test('the header is handed on once however many wires replay it', (context) => {
  const { wires, heard } = bench(context)

  wires[0].header()
  wires[0].picture(A_FRAGMENT)
  context.mock.timers.tick(FRESH_WIRE_EVERY_MS)

  wires[1].header()
  wires[1].picture(A_FRAGMENT * 2)

  assert.equal(heard.headers.length, 1)
})

test('a caption replayed onto a fresh wire is not shown a second time', (context) => {
  const { wires, heard } = bench(context)

  wires[0].header()
  wires[0].picture(A_FRAGMENT)
  wires[0].caption(A_FRAGMENT)
  context.mock.timers.tick(FRESH_WIRE_EVERY_MS)

  wires[1].caption(A_FRAGMENT)
  wires[1].picture(A_FRAGMENT * 2)
  wires[1].caption(A_FRAGMENT * 5)

  assert.deepEqual(heard.captions, [A_FRAGMENT, A_FRAGMENT * 5])
})

test('a wire that was let go of is not reported as a drop', (context) => {
  const { wires, heard } = bench(context)

  wires[0].header()
  wires[0].picture(A_FRAGMENT)
  context.mock.timers.tick(FRESH_WIRE_EVERY_MS)
  wires[1].picture(A_FRAGMENT * 2)

  wires[0].drop(NO_GOODBYE)

  assert.deepEqual(heard.drops, [])
  assert.deepEqual(heard.endings, [])
})

test('a fresh wire that never carries is tried again without disturbing the viewer', (context) => {
  const { wires, heard } = bench(context)

  wires[0].header()
  wires[0].picture(A_FRAGMENT)
  context.mock.timers.tick(FRESH_WIRE_EVERY_MS)

  wires[1].drop(NO_GOODBYE)

  assert.deepEqual(heard.drops, [])
  assert.deepEqual(heard.endings, [])
  assert.equal(wires[0].closedWith, null)

  context.mock.timers.tick(FRESH_WIRE_AGAIN_AFTER_MS)

  assert.equal(wires.length, 3)

  wires[2].picture(A_FRAGMENT * 2)

  assert.equal(wires[0].closedWith, CLOSED_CLEANLY)
})

test('a fresh wire that is refused does not end the session', (context) => {
  const { wires, heard } = bench(context)

  wires[0].header()
  wires[0].picture(A_FRAGMENT)
  context.mock.timers.tick(FRESH_WIRE_EVERY_MS)

  wires[1].control(refusalPayload('noTunerFree'))

  assert.equal(heard.refusals, 0)
  assert.equal(wires[1].closedWith, CLOSED_CLEANLY)
  assert.equal(wires[0].closedWith, null)

  wires[0].picture(A_FRAGMENT * 2)

  assert.deepEqual(heard.pictures, [A_FRAGMENT, A_FRAGMENT * 2])
})

test('the wire being carried going away unasked is still reported as a drop', (context) => {
  const { wires, heard } = bench(context)

  wires[0].header()
  wires[0].picture(A_FRAGMENT)

  wires[0].drop(NO_GOODBYE)

  assert.deepEqual(heard.drops, [NO_GOODBYE])
})

test('the wire being carried going away while a fresh one is in the air is a drop', (context) => {
  const { wires, heard } = bench(context)

  wires[0].header()
  wires[0].picture(A_FRAGMENT)
  context.mock.timers.tick(FRESH_WIRE_EVERY_MS)

  wires[0].drop(NO_GOODBYE)

  assert.deepEqual(heard.drops, [NO_GOODBYE])
})

test('each wire answers its own ping', (context) => {
  const { wires } = bench(context)

  wires[0].header()
  wires[0].picture(A_FRAGMENT)
  context.mock.timers.tick(FRESH_WIRE_EVERY_MS)

  wires[1].control(PING)

  assert.equal(saidPong(wires[1]), true)
  assert.equal(saidPong(wires[0]), false)

  wires[0].control(PING)

  assert.equal(saidPong(wires[0]), true)
})

test('startup progress is taken only from the wire being carried', (context) => {
  const { wires, heard } = bench(context)

  wires[0].header()
  wires[0].picture(A_FRAGMENT)
  context.mock.timers.tick(FRESH_WIRE_EVERY_MS)

  wires[1].control(progressPayload({ tunerSecured: 1 }))

  assert.equal(heard.progress, 0)

  wires[0].control(progressPayload({ tunerSecured: 1 }))

  assert.equal(heard.progress, 1)
})

test('the supply ending on a fresh wire ends the session', (context) => {
  const { wires, heard } = bench(context)

  wires[0].header()
  wires[0].picture(A_FRAGMENT)
  context.mock.timers.tick(FRESH_WIRE_EVERY_MS)

  wires[1].control(endingPayload('windowClosed'))

  assert.deepEqual(heard.endings, ['windowClosed'])
})

test('no more wires are laid once the supply has ended', (context) => {
  const { wires } = bench(context)

  wires[0].header()
  wires[0].picture(A_FRAGMENT)
  wires[0].control(endingPayload('letGo'))

  context.mock.timers.tick(FRESH_WIRE_EVERY_MS * 3)

  assert.equal(wires.length, 1)
})

test('relaying again and again leaves one wire open and no delay behind', (context) => {
  const { wires, heard } = bench(context)

  wires[0].header()
  wires[0].picture(A_FRAGMENT)

  for (let round = 1; round <= 4; round += 1) {
    context.mock.timers.tick(FRESH_WIRE_EVERY_MS)
    wires[round].picture(A_FRAGMENT * (round + 1))
  }

  assert.equal(wires.length, 5)
  assert.deepEqual(
    wires
      .filter((wire) => wire.closedWith === null)
      .map((wire) => wires.indexOf(wire)),
    [4],
  )
  assert.deepEqual(heard.pictures, [
    A_FRAGMENT,
    A_FRAGMENT * 2,
    A_FRAGMENT * 3,
    A_FRAGMENT * 4,
    A_FRAGMENT * 5,
  ])
  assert.deepEqual(heard.drops, [])
})

test('leaving closes every wire it has open and lays no more', (context) => {
  const { session, wires, heard } = bench(context)

  wires[0].header()
  wires[0].picture(A_FRAGMENT)
  context.mock.timers.tick(FRESH_WIRE_EVERY_MS)

  session.leave()

  assert.equal(wires[0].closedWith, CLOSED_CLEANLY)
  assert.equal(wires[1].closedWith, CLOSED_CLEANLY)
  assert.equal(saidLeaving(wires[0]), true)
  assert.equal(saidLeaving(wires[1]), true)

  context.mock.timers.tick(FRESH_WIRE_EVERY_MS * 3)

  assert.equal(wires.length, 2)
  assert.deepEqual(heard.drops, [])
})

test('a canvas is taken from whichever wire announces it', (context) => {
  const { wires, heard } = bench(context)

  wires[0].header()
  wires[0].carry(
    frameOf(
      'captionHeader',
      0,
      captionCanvasPayload({ width: 960, height: 540 }),
    ),
  )

  assert.equal(heard.canvases, 1)
})
