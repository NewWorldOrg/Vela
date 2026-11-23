import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'

import { LATE_START_SECONDS, START_BUFFER_SECONDS } from '@/lib/live-buffer'
import { LiveFeed } from '@/components/live/live-feed'
import { LiveStart } from '@/components/live/live-start'
import { fragment, header } from '@/tests/lib/live-fragments'

class Ranges {
  private readonly held: [number, number][]

  constructor(held: [number, number][]) {
    this.held = held
  }

  get length(): number {
    return this.held.length
  }

  start(index: number): number {
    return this.held[index][0]
  }

  end(index: number): number {
    return this.held[index][1]
  }
}

class Buffer extends EventTarget {
  mode = 'sequence'

  updating = false

  buffered = new Ranges([])

  appendBuffer(): void {
    this.updating = true
    setTimeout(() => {
      this.updating = false
      this.dispatchEvent(new Event('updateend'))
    }, 0)
  }

  remove(): void {}
}

class Source extends EventTarget {
  static made: Source[] = []

  static isTypeSupported(): boolean {
    return true
  }

  readyState: ReadyState = 'closed'

  constructor() {
    super()
    Source.made.push(this)
  }

  buffer?: Buffer

  addSourceBuffer(): Buffer {
    this.buffer = new Buffer()

    return this.buffer
  }

  endOfStream(): void {
    this.readyState = 'ended'
  }

  open(): void {
    this.readyState = 'open'
    this.dispatchEvent(new Event('sourceopen'))
  }
}

function box(type: string, ...payload: (Uint8Array | number[])[]): Uint8Array {
  const parts = payload.map((part) =>
    part instanceof Uint8Array ? part : new Uint8Array(part),
  )
  const bytes = new Uint8Array(
    8 + parts.reduce((sum, part) => sum + part.length, 0),
  )

  new DataView(bytes.buffer).setUint32(0, bytes.length)
  bytes.set(
    [...type].map((char) => char.charCodeAt(0)),
    4,
  )

  let at = 8

  for (const part of parts) {
    bytes.set(part, at)
    at += part.length
  }

  return bytes
}

const HEADER = box(
  'moov',
  box(
    'trak',
    box(
      'mdia',
      box(
        'minf',
        box(
          'stbl',
          box(
            'stsd',
            [0, 0, 0, 0, 0, 0, 0, 1],
            box('avc1', new Uint8Array(78), box('avcC', [1, 0x64, 0, 0x1f])),
          ),
        ),
      ),
    ),
  ),
)

const FRAGMENT = box('moof')

function inABrowser(context: TestContext): void {
  const was = Object.getOwnPropertyDescriptor(globalThis, 'MediaSource')

  Object.defineProperty(globalThis, 'MediaSource', {
    value: Source,
    configurable: true,
    writable: true,
  })
  context.mock.method(URL, 'createObjectURL', () => 'blob:live')
  context.mock.method(URL, 'revokeObjectURL', () => {})
  context.after(() => {
    if (was) {
      Object.defineProperty(globalThis, 'MediaSource', was)
    } else {
      Reflect.deleteProperty(globalThis, 'MediaSource')
    }
  })
}

const settled = () => new Promise((settle) => setTimeout(settle, 5))

test('whoever feeds the picture hears each append as it lands, the header and every fragment', async (context) => {
  inABrowser(context)

  const video = {
    currentTime: 0,
    disableRemotePlayback: false,
    src: '',
  } as unknown as HTMLVideoElement
  let appended = 0
  const feed = new LiveFeed(
    video,
    (fault) => assert.fail(`the feed faulted: ${fault}`),
    () => {
      appended += 1
    },
  )

  Source.made.at(-1)!.open()
  feed.header(HEADER)
  await settled()

  assert.equal(appended, 1)

  feed.append(FRAGMENT)
  await settled()
  feed.append(FRAGMENT)
  await settled()

  assert.equal(appended, 3)

  feed.close()
})

const PICTURE_SCALE = 90_000

const SOUND_SCALE = 48_000

const TRACKS = [
  { id: 1, handler: 'vide', timescale: PICTURE_SCALE },
  { id: 2, handler: 'soun', timescale: SOUND_SCALE },
] as const

const FIRST_PICTURE_AT = 10

const SOUND_AHEAD_SECONDS = 0.9

class Picture {
  currentTime = 0

  readyState = 1

  disableRemotePlayback = false

  src = ''

  plays = 0

  play(): Promise<void> {
    this.plays += 1

    return Promise.resolve()
  }
}

async function onAir(context: TestContext, soundFrom: number) {
  inABrowser(context)

  const picture = new Picture()
  const clock = { ms: 0 }
  const feed = new LiveFeed(
    picture as unknown as HTMLVideoElement,
    (fault) => assert.fail(`the feed faulted: ${fault}`),
    () => {},
  )
  const source = Source.made.at(-1)!
  const starter = new LiveStart(
    picture,
    feed,
    () => START_BUFFER_SECONDS,
    () => clock.ms,
    () => assert.fail('the play was refused'),
  )

  source.open()
  feed.header(header(...TRACKS))
  await settled()
  feed.append(
    fragment(
      { track: 1, at: FIRST_PICTURE_AT * PICTURE_SCALE },
      { track: 2, at: Math.round(soundFrom * SOUND_SCALE), samples: 40 },
    ),
  )
  await settled()

  return {
    picture,
    feed,
    starter,
    holds: (from: number, to: number) => {
      source.buffer!.buffered = new Ranges([[from, to]])
      starter.check()
    },
    pass: (seconds: number) => {
      clock.ms += seconds * 1000
    },
  }
}

test('sound that starts 0.9 s before the picture: the browser holds the run from the sound, and the feed says picture and sound begin at the first picture', async (context) => {
  const soundFrom = FIRST_PICTURE_AT - SOUND_AHEAD_SECONDS
  const { feed, holds } = await onAir(context, soundFrom)

  holds(soundFrom, FIRST_PICTURE_AT - 0.04)

  assert.equal(feed.start(), soundFrom)
  assert.equal(feed.pictureFrom(), FIRST_PICTURE_AT)

  feed.close()
})

test('sound that starts 0.9 s before the picture: the sound alone, however much of it, starts nothing', async (context) => {
  const soundFrom = FIRST_PICTURE_AT - SOUND_AHEAD_SECONDS
  const { picture, starter, feed, holds, pass } = await onAir(
    context,
    soundFrom,
  )

  holds(soundFrom, FIRST_PICTURE_AT - 0.04)

  assert.ok(FIRST_PICTURE_AT - 0.04 - soundFrom > START_BUFFER_SECONDS)
  assert.equal(picture.plays, 0)

  pass(START_BUFFER_SECONDS + LATE_START_SECONDS + 5)
  holds(soundFrom, FIRST_PICTURE_AT - 0.04)

  assert.equal(picture.plays, 0)
  assert.equal(starter.started, false)

  feed.close()
})

test('sound that starts 0.9 s before the picture: the start waits until the figure is held from the first picture on, and plays from the first picture', async (context) => {
  const soundFrom = FIRST_PICTURE_AT - SOUND_AHEAD_SECONDS
  const { picture, feed, holds } = await onAir(context, soundFrom)

  holds(soundFrom, FIRST_PICTURE_AT - 0.04)
  holds(soundFrom, FIRST_PICTURE_AT + 0.05)
  holds(soundFrom, FIRST_PICTURE_AT + 0.15)

  assert.equal(picture.plays, 0)

  holds(soundFrom, FIRST_PICTURE_AT + START_BUFFER_SECONDS)

  assert.equal(picture.plays, 1)
  assert.equal(picture.currentTime, FIRST_PICTURE_AT)

  feed.close()
})

test('sound that starts 0.9 s before the picture: with more than the figure held, the playhead is the figure behind the edge and still not before the first picture', async (context) => {
  const soundFrom = FIRST_PICTURE_AT - SOUND_AHEAD_SECONDS
  const { picture, feed, holds } = await onAir(context, soundFrom)

  holds(soundFrom, FIRST_PICTURE_AT + 0.5)

  assert.equal(picture.plays, 1)
  assert.equal(
    picture.currentTime,
    FIRST_PICTURE_AT + 0.5 - START_BUFFER_SECONDS,
  )
  assert.ok(picture.currentTime >= FIRST_PICTURE_AT)

  feed.close()
})

test('sound that starts 0.9 s before the picture: a picture that stays short is played from its first frame once the wait is out', async (context) => {
  const soundFrom = FIRST_PICTURE_AT - SOUND_AHEAD_SECONDS
  const { picture, feed, holds, pass } = await onAir(context, soundFrom)

  holds(soundFrom, FIRST_PICTURE_AT + 0.05)
  pass(LATE_START_SECONDS)
  holds(soundFrom, FIRST_PICTURE_AT + 0.08)

  assert.equal(picture.plays, 0)

  pass(START_BUFFER_SECONDS)
  holds(soundFrom, FIRST_PICTURE_AT + 0.08)

  assert.equal(picture.plays, 1)
  assert.equal(picture.currentTime, FIRST_PICTURE_AT)

  feed.close()
})

test('picture and sound that start together: the start is as it was, the figure behind the edge from where the run begins', async (context) => {
  const { picture, feed, holds } = await onAir(context, FIRST_PICTURE_AT)

  holds(FIRST_PICTURE_AT, FIRST_PICTURE_AT + 0.15)

  assert.equal(feed.pictureFrom(), FIRST_PICTURE_AT)
  assert.equal(picture.plays, 0)

  holds(FIRST_PICTURE_AT, FIRST_PICTURE_AT + 1.5)

  assert.equal(picture.plays, 1)
  assert.equal(
    picture.currentTime,
    FIRST_PICTURE_AT + 1.5 - START_BUFFER_SECONDS,
  )

  feed.close()
})

test('a picture that starts before the sound: the run begins where both are held, and the start is counted from there', async (context) => {
  const soundFrom = FIRST_PICTURE_AT + 0.3
  const { picture, feed, holds } = await onAir(context, soundFrom)

  holds(soundFrom, soundFrom + 0.1)

  assert.equal(feed.pictureFrom(), soundFrom)
  assert.equal(picture.plays, 0)

  holds(soundFrom, soundFrom + START_BUFFER_SECONDS)

  assert.equal(picture.plays, 1)
  assert.equal(picture.currentTime, soundFrom)

  feed.close()
})
