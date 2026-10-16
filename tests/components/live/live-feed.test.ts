import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'

import { LiveFeed } from '@/components/live/live-feed'

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

  addSourceBuffer(): Buffer {
    return new Buffer()
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
