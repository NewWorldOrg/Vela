import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'

import { openPlaylist } from '@/components/live/live-playlist'

const DECODE = 3

const NETWORK = 2

class Picture extends EventTarget {
  src = ''

  error: { code: number } | null = null

  played = 0

  loaded = 0

  refuses = false

  play(): Promise<void> {
    this.played += 1

    return this.refuses
      ? Promise.reject(new Error('not allowed'))
      : Promise.resolve()
  }

  load(): void {
    this.loaded += 1
  }

  removeAttribute(name: string): void {
    if (name === 'src') {
      this.src = ''
    }
  }

  failWith(code: number): void {
    this.error = { code }
    this.dispatchEvent(new Event('error'))
  }
}

function inABrowser(context: TestContext): void {
  const was = Object.getOwnPropertyDescriptor(globalThis, 'MediaError')

  Object.defineProperty(globalThis, 'MediaError', {
    value: { MEDIA_ERR_DECODE: DECODE },
    configurable: true,
    writable: true,
  })
  context.after(() => {
    if (was) {
      Object.defineProperty(globalThis, 'MediaError', was)
    } else {
      Reflect.deleteProperty(globalThis, 'MediaError')
    }
  })
}

function heard() {
  const said: string[] = []

  return {
    said,
    onPicture: () => said.push('picture'),
    onRefusedToPlay: () => said.push('refused'),
    onFault: (fault: string) => said.push(fault),
  }
}

const settled = () => new Promise((settle) => setTimeout(settle, 0))

const PLAYLIST = '/api/live/32736-1024/hls.m3u8?profile=720p&sound=main'

test('the playlist is handed to the video as its source, and the picture plays once it has loaded', async (context) => {
  inABrowser(context)
  const video = new Picture()
  const listening = heard()

  openPlaylist(video as unknown as HTMLVideoElement, PLAYLIST, listening)

  assert.equal(video.src, PLAYLIST)
  assert.deepEqual(listening.said, [])

  video.dispatchEvent(new Event('loadeddata'))
  await settled()

  assert.deepEqual(listening.said, ['picture'])
  assert.equal(video.played, 1)
})

test('a picture the browser will not start on its own is left paused', async (context) => {
  inABrowser(context)
  const video = new Picture()
  const listening = heard()

  video.refuses = true
  openPlaylist(video as unknown as HTMLVideoElement, PLAYLIST, listening)
  video.dispatchEvent(new Event('loadeddata'))
  await settled()

  assert.deepEqual(listening.said, ['picture', 'refused'])
})

test('a picture the browser cannot decode is unsupported, and any other failure is a drop', (context) => {
  inABrowser(context)
  const undecoded = new Picture()
  const dropped = new Picture()
  const listening = heard()

  openPlaylist(undecoded as unknown as HTMLVideoElement, PLAYLIST, listening)
  openPlaylist(dropped as unknown as HTMLVideoElement, PLAYLIST, listening)
  undecoded.failWith(DECODE)
  dropped.failWith(NETWORK)

  assert.deepEqual(listening.said, ['unsupported', 'dropped'])
})

test('a playlist that comes to an end is a drop', (context) => {
  inABrowser(context)
  const video = new Picture()
  const listening = heard()

  openPlaylist(video as unknown as HTMLVideoElement, PLAYLIST, listening)
  video.dispatchEvent(new Event('ended'))

  assert.deepEqual(listening.said, ['dropped'])
})

test('leaving lets go of the playlist and hears nothing more from the video', (context) => {
  inABrowser(context)
  const video = new Picture()
  const listening = heard()

  openPlaylist(
    video as unknown as HTMLVideoElement,
    PLAYLIST,
    listening,
  ).leave()

  assert.equal(video.src, '')
  assert.equal(video.loaded, 1)

  video.dispatchEvent(new Event('loadeddata'))
  video.failWith(NETWORK)

  assert.deepEqual(listening.said, [])
})
