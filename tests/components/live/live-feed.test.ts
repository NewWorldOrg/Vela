import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'

import {
  BLIND_START_SECONDS,
  BUFFER_STEPS_SECONDS,
  LATE_START_SECONDS,
  OVERDUE_START_SECONDS,
  START_BUFFER_SECONDS,
} from '@/lib/live-buffer'
import { LiveFeed } from '@/components/live/live-feed'
import { LiveStart } from '@/components/live/live-start'
import {
  RUN_FLAGS,
  fragment,
  header,
  headerAsSent,
} from '@/tests/lib/live-fragments'

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
  readyState = 1

  disableRemotePlayback = false

  src = ''

  plays = 0

  readonly put: number[] = []

  get currentTime(): number {
    return this.put.at(-1) ?? 0
  }

  set currentTime(at: number) {
    this.put.push(at)
  }

  play(): Promise<void> {
    this.plays += 1

    return Promise.resolve()
  }
}

function watched(context: TestContext, target: number) {
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
    () => target,
    () => clock.ms,
    () => assert.fail('the play was refused'),
  )

  source.open()

  return { picture, clock, feed, source, starter }
}

async function onAir(
  context: TestContext,
  soundFrom: number,
  target = START_BUFFER_SECONDS,
) {
  const { picture, clock, feed, source, starter } = watched(context, target)

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

test('sound that starts 0.9 s before the picture: the sound alone, however much of it, moves nothing and plays nothing while the picture can still be waited for', async (context) => {
  const soundFrom = FIRST_PICTURE_AT - SOUND_AHEAD_SECONDS
  const { picture, starter, feed, holds, pass } = await onAir(
    context,
    soundFrom,
  )

  holds(soundFrom, FIRST_PICTURE_AT - 0.04)

  assert.ok(FIRST_PICTURE_AT - 0.04 - soundFrom > BLIND_START_SECONDS)
  assert.equal(picture.plays, 0)

  pass(START_BUFFER_SECONDS + LATE_START_SECONDS + 1)
  holds(soundFrom, FIRST_PICTURE_AT - 0.04)

  assert.equal(picture.plays, 0)
  assert.deepEqual(picture.put, [])
  assert.equal(starter.started, false)

  feed.close()
})

test('sound that starts 0.9 s before the picture: the moment the first picture is held, playback starts on that picture', async (context) => {
  const soundFrom = FIRST_PICTURE_AT - SOUND_AHEAD_SECONDS
  const { picture, feed, holds } = await onAir(context, soundFrom)

  holds(soundFrom, FIRST_PICTURE_AT - 0.04)

  assert.equal(picture.plays, 0)

  holds(soundFrom, FIRST_PICTURE_AT + 0.02)

  assert.equal(picture.plays, 1)
  assert.deepEqual(picture.put, [FIRST_PICTURE_AT])

  feed.close()
})

test('sound that starts 0.9 s before the picture: on a device that has raised its figure the first picture is shown at once and played when the figure is held from it', async (context) => {
  const soundFrom = FIRST_PICTURE_AT - SOUND_AHEAD_SECONDS
  const raised = BUFFER_STEPS_SECONDS[2]
  const { picture, feed, holds } = await onAir(context, soundFrom, raised)

  holds(soundFrom, FIRST_PICTURE_AT + 0.02)

  assert.deepEqual(picture.put, [FIRST_PICTURE_AT])
  assert.equal(picture.plays, 0)

  holds(soundFrom, FIRST_PICTURE_AT + raised - 0.05)

  assert.equal(picture.plays, 0)

  holds(soundFrom, FIRST_PICTURE_AT + raised)

  assert.equal(picture.plays, 1)
  assert.deepEqual(picture.put, [FIRST_PICTURE_AT])

  feed.close()
})

test('sound that starts 0.9 s before the picture: a picture that never comes does not keep the start waiting for ever', async (context) => {
  const soundFrom = FIRST_PICTURE_AT - SOUND_AHEAD_SECONDS
  const { picture, feed, holds, pass } = await onAir(context, soundFrom)

  holds(soundFrom, FIRST_PICTURE_AT - 0.04)
  pass(OVERDUE_START_SECONDS)
  holds(soundFrom, FIRST_PICTURE_AT - 0.04)

  assert.equal(picture.plays, 0)

  pass(START_BUFFER_SECONDS)
  holds(soundFrom, FIRST_PICTURE_AT - 0.04)

  assert.equal(picture.plays, 1)
  assert.deepEqual(picture.put, [FIRST_PICTURE_AT - 0.04 - BLIND_START_SECONDS])

  feed.close()
})

test('picture and sound that start together: playback starts where the run begins, the first time anything is held', async (context) => {
  const { picture, feed, holds } = await onAir(context, FIRST_PICTURE_AT)

  holds(FIRST_PICTURE_AT, FIRST_PICTURE_AT + 0.03)

  assert.equal(feed.pictureFrom(), FIRST_PICTURE_AT)
  assert.equal(picture.plays, 1)
  assert.deepEqual(picture.put, [FIRST_PICTURE_AT])

  feed.close()
})

test('a picture that starts before the sound: the run begins where both are held, and playback starts there', async (context) => {
  const soundFrom = FIRST_PICTURE_AT + 0.3
  const { picture, feed, holds } = await onAir(context, soundFrom)

  holds(soundFrom, soundFrom + 0.02)

  assert.equal(feed.pictureFrom(), soundFrom)
  assert.equal(picture.plays, 1)
  assert.deepEqual(picture.put, [soundFrom])

  feed.close()
})

const SENT_PICTURE_SCALE = 60_000

const SENT_SOUND_SCALE = 48_000

const SENT_DECODED_AT = 2_400_000_000

const SENT_SHOWN_LATER = 3003

const SENT_FIRST_PICTURE_AT = SENT_DECODED_AT / SENT_PICTURE_SCALE

const SENT_SOUND_AT = 1_919_964_480

const SENT_SOUND_FROM = SENT_SOUND_AT / SENT_SOUND_SCALE

const SENT_TRACKS = [
  {
    id: 1,
    handler: 'vide',
    timescale: SENT_PICTURE_SCALE,
    mediaVersion: 1,
    edit: SENT_SHOWN_LATER,
  },
  {
    id: 2,
    handler: 'soun',
    timescale: SENT_SOUND_SCALE,
    mediaVersion: 1,
    edit: 0,
  },
] as const

function firstSent(): Uint8Array {
  return fragment(
    {
      track: 1,
      at: SENT_DECODED_AT,
      offset: SENT_SHOWN_LATER,
      version: 1,
      flags:
        RUN_FLAGS.DATA_OFFSET |
        RUN_FLAGS.FIRST_SAMPLE_FLAGS |
        RUN_FLAGS.SAMPLE_OFFSET,
      defaults: true,
    },
    {
      track: 2,
      at: SENT_SOUND_AT,
      samples: 31,
      version: 1,
      flags:
        RUN_FLAGS.DATA_OFFSET |
        RUN_FLAGS.SAMPLE_DURATION |
        RUN_FLAGS.SAMPLE_SIZE,
      defaults: true,
    },
  )
}

function laterSent(nth: number): Uint8Array {
  return fragment(
    {
      track: 1,
      at: SENT_DECODED_AT + 1001 + (nth - 1) * 3003,
      offsets: nth % 2 === 1 ? [7007, 3003, 3003] : [3003, 7007, 3003],
      version: 1,
      flags:
        RUN_FLAGS.DATA_OFFSET | RUN_FLAGS.SAMPLE_SIZE | RUN_FLAGS.SAMPLE_OFFSET,
      defaults: true,
    },
    {
      track: 2,
      at: SENT_SOUND_AT + 30_720 + (nth - 1) * 2400,
      samples: 3,
      version: 1,
      flags: RUN_FLAGS.DATA_OFFSET | RUN_FLAGS.SAMPLE_SIZE,
      defaults: true,
    },
  )
}

async function asSent(
  context: TestContext,
  init: Uint8Array = headerAsSent(...SENT_TRACKS),
) {
  const { picture, clock, feed, source, starter } = watched(
    context,
    START_BUFFER_SECONDS,
  )

  feed.header(init)
  await settled()

  let sent = 0

  return {
    picture,
    feed,
    starter,
    arrives: async (heldTo: number, bytes?: Uint8Array) => {
      feed.append(bytes ?? (sent === 0 ? firstSent() : laterSent(sent)))
      sent += 1
      await settled()
      clock.ms += 50
      source.buffer!.buffered = new Ranges([[SENT_SOUND_FROM, heldTo]])
      starter.check()
    },
    pass: (seconds: number) => {
      clock.ms += seconds * 1000
      starter.check()
    },
  }
}

test('the stream as it is sent, tens of thousands of seconds in: nothing moves while the sound that came first is all that is held, and playback starts on the key frame the moment it is held', async (context) => {
  const { picture, feed, arrives } = await asSent(context)

  assert.ok(SENT_FIRST_PICTURE_AT > 30_000)
  assert.ok(SENT_FIRST_PICTURE_AT - SENT_SOUND_FROM > 0.7)

  await arrives(SENT_SOUND_FROM + 0.64)

  assert.equal(feed.pictureFrom(), SENT_FIRST_PICTURE_AT)
  assert.equal(picture.plays, 0)
  assert.deepEqual(picture.put, [])

  await arrives(SENT_FIRST_PICTURE_AT - 0.03)

  assert.equal(picture.plays, 0)

  await arrives(SENT_FIRST_PICTURE_AT + 0.03)

  assert.equal(feed.pictureFrom(), SENT_FIRST_PICTURE_AT)
  assert.equal(picture.plays, 1)
  assert.deepEqual(picture.put, [SENT_FIRST_PICTURE_AT])

  feed.close()
})

test('the stream as it is sent, without its edit list: the key frame is where its fragment says, later than the browser of the edit list would show it', async (context) => {
  const { picture, feed, arrives } = await asSent(
    context,
    headerAsSent(
      { ...SENT_TRACKS[0], edit: undefined },
      { ...SENT_TRACKS[1], edit: undefined },
    ),
  )
  const shownAt = (SENT_DECODED_AT + SENT_SHOWN_LATER) / SENT_PICTURE_SCALE

  await arrives(SENT_FIRST_PICTURE_AT + 0.03)

  assert.equal(feed.pictureFrom(), shownAt)
  assert.equal(picture.plays, 0)

  await arrives(shownAt + 0.03)

  assert.equal(picture.plays, 1)
  assert.deepEqual(picture.put, [shownAt])

  feed.close()
})

test('the stream as it is sent, with an empty edit ahead of its edit: playback starts on the key frame where the edit has it shown', async (context) => {
  const { picture, feed, arrives } = await asSent(
    context,
    headerAsSent(
      { ...SENT_TRACKS[0], edit: undefined, edits: [-1, SENT_SHOWN_LATER] },
      SENT_TRACKS[1],
    ),
  )

  await arrives(SENT_FIRST_PICTURE_AT + 0.03)

  assert.equal(picture.plays, 1)
  assert.deepEqual(picture.put, [SENT_FIRST_PICTURE_AT])

  feed.close()
})

test('the stream as it is sent, with a header no picture time can be read by: the start is the one from before the figure came down', async (context) => {
  const { picture, feed, arrives } = await asSent(
    context,
    headerAsSent({ ...SENT_TRACKS[0], timescale: 0 }, SENT_TRACKS[1]),
  )

  await arrives(SENT_SOUND_FROM + 0.3)

  assert.equal(feed.pictureFrom(), undefined)
  assert.equal(picture.plays, 0)

  await arrives(SENT_SOUND_FROM + 0.64)

  assert.equal(picture.plays, 1)
  assert.deepEqual(picture.put, [SENT_SOUND_FROM + 0.64 - BLIND_START_SECONDS])

  feed.close()
})

test('the stream as it is sent, with fragments that cannot be read: the start is the one from before the figure came down', async (context) => {
  const { picture, feed, arrives } = await asSent(context)

  await arrives(
    SENT_SOUND_FROM + 0.64,
    new Uint8Array([0, 0, 0, 8, 1, 2, 3, 4]),
  )

  assert.equal(feed.pictureFrom(), undefined)
  assert.equal(picture.plays, 1)
  assert.deepEqual(picture.put, [SENT_SOUND_FROM + 0.64 - BLIND_START_SECONDS])

  feed.close()
})

test('the stream as it is sent, read in a timescale the browser does not count in: the pictures are far from what is held, and the start is the one from before the figure came down', async (context) => {
  const { picture, feed, arrives } = await asSent(
    context,
    headerAsSent(
      { ...SENT_TRACKS[0], timescale: SENT_PICTURE_SCALE / 2 },
      SENT_TRACKS[1],
    ),
  )

  await arrives(SENT_SOUND_FROM + 0.64)

  assert.equal(feed.pictureFrom(), undefined)
  assert.equal(picture.plays, 1)
  assert.deepEqual(picture.put, [SENT_SOUND_FROM + 0.64 - BLIND_START_SECONDS])

  feed.close()
})

test('the stream as it is sent, read a second and a half ahead of what the browser holds: the start comes late, on the picture as it was read, and it comes', async (context) => {
  const ahead = 1.5
  const readAt = SENT_FIRST_PICTURE_AT + ahead
  const unread = new Uint8Array([0, 0, 0, 8, 1, 2, 3, 4])
  const { picture, feed, arrives } = await asSent(context)

  await arrives(
    SENT_SOUND_FROM + 0.64,
    fragment({
      track: 1,
      at: SENT_DECODED_AT,
      offset: SENT_SHOWN_LATER + ahead * SENT_PICTURE_SCALE,
      version: 1,
      defaults: true,
    }),
  )

  assert.equal(feed.pictureFrom(), readAt)
  assert.equal(picture.plays, 0)

  await arrives(SENT_FIRST_PICTURE_AT + 1, unread)

  assert.equal(picture.plays, 0)
  assert.deepEqual(picture.put, [])

  await arrives(readAt + 0.02, unread)

  assert.equal(picture.plays, 1)
  assert.deepEqual(picture.put, [readAt])

  feed.close()
})

test('the stream as it is sent, with a picture the browser never comes to hold: past the bound the start is the one from before the figure came down', async (context) => {
  const { picture, feed, arrives, pass } = await asSent(context)

  await arrives(SENT_SOUND_FROM + 0.64)
  pass(OVERDUE_START_SECONDS - 0.5)

  assert.equal(picture.plays, 0)

  pass(START_BUFFER_SECONDS + 0.5)

  assert.equal(picture.plays, 1)
  assert.deepEqual(picture.put, [SENT_SOUND_FROM + 0.64 - BLIND_START_SECONDS])

  feed.close()
})
