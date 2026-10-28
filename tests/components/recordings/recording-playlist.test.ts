import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'

import { openRecordingPlaylist } from '@/components/recordings/recording-playlist'

const DECODE = 3

const NETWORK = 2

const SRC_NOT_SUPPORTED = 4

class Picture extends EventTarget {
  src = ''

  error: { code: number } | null = null

  loaded = 0

  load(): void {
    this.loaded += 1
  }

  getAttribute(name: string): string | null {
    return name === 'src' && this.src !== '' ? this.src : null
  }

  removeAttribute(name: string): void {
    if (name === 'src') {
      this.src = ''
    }
  }

  pictured(): void {
    this.dispatchEvent(new Event('loadeddata'))
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
    onFault: (fault: string) => said.push(fault),
    onCut: () => said.push('cut'),
  }
}

const PLAYLIST = '/api/videos/1266/hls.m3u8?from=600&profile=1080p60&sound=main'

function opened(context: TestContext) {
  inABrowser(context)
  const video = new Picture()
  const listening = heard()
  const carrying = openRecordingPlaylist(
    video as unknown as HTMLVideoElement,
    PLAYLIST,
    listening,
  )

  return { video, said: listening.said, carrying }
}

test('the playlist is handed to the video as its source', (context) => {
  const { video, said } = opened(context)

  assert.equal(video.src, PLAYLIST)
  assert.deepEqual(said, [])
})

test('a playlist the video could not open before any picture came is refused', (context) => {
  const { video, said } = opened(context)

  video.failWith(SRC_NOT_SUPPORTED)

  assert.deepEqual(said, ['refused'])
})

test('a picture the browser cannot decode is unplayable, before or after it came', (context) => {
  const before = opened(context)

  before.video.failWith(DECODE)

  const after = opened(context)

  after.video.pictured()
  after.video.failWith(DECODE)

  assert.deepEqual(before.said, ['unplayable'])
  assert.deepEqual(after.said, ['unplayable'])
})

test('a playlist that fails once the picture has come is cut, to be opened again where it stood', (context) => {
  const { video, said } = opened(context)

  video.pictured()
  video.failWith(NETWORK)

  assert.deepEqual(said, ['cut'])
})

test('closing takes the playlist away from the video and hears nothing after', (context) => {
  const { video, said, carrying } = opened(context)

  carrying.close()
  video.failWith(NETWORK)

  assert.equal(video.src, '')
  assert.equal(video.loaded, 1)
  assert.deepEqual(said, [])
})

test('closing leaves a source the page has handed the video since, such as the artefact played as it is', (context) => {
  const { video, said, carrying } = opened(context)
  const artefact = '/api/videos/1266/play?from=600&sound=main&source=artefact'

  video.src = artefact
  carrying.close()

  assert.equal(video.src, artefact)
  assert.equal(video.loaded, 0)
  assert.deepEqual(said, [])
})
