import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'

import { recordingCarriage } from '@/components/recordings/recording-carriage'

class Source {
  static isTypeSupported(): boolean {
    return true
  }
}

function given(context: TestContext, name: string, value: unknown): void {
  const was = Object.getOwnPropertyDescriptor(globalThis, name)

  Object.defineProperty(globalThis, name, {
    value,
    configurable: true,
    writable: true,
  })
  context.after(() => {
    if (was) {
      Object.defineProperty(globalThis, name, was)
    } else {
      Reflect.deleteProperty(globalThis, name)
    }
  })
}

function answering(answer: CanPlayTypeResult) {
  const asked: string[] = []

  return {
    asked,
    video: () => ({
      canPlayType: (type: string) => {
        asked.push(type)

        return answer
      },
    }),
  }
}

test('a browser with the managed media source is fed the recording, and is never asked about playlists', (context) => {
  given(context, 'MediaSource', undefined)
  given(context, 'ManagedMediaSource', Source)
  const probe = answering('maybe')

  assert.equal(recordingCarriage(probe.video), 'feed')
  assert.deepEqual(probe.asked, [])
})

test('a browser with only the plain media source is fed the recording too', (context) => {
  given(context, 'MediaSource', Source)
  given(context, 'ManagedMediaSource', undefined)

  assert.equal(recordingCarriage(answering('').video), 'feed')
})

test('a browser with neither media source is handed the playlist when its video plays HLS', (context) => {
  given(context, 'MediaSource', undefined)
  given(context, 'ManagedMediaSource', undefined)
  const probe = answering('maybe')

  assert.equal(recordingCarriage(probe.video), 'playlist')
  assert.deepEqual(probe.asked, ['application/vnd.apple.mpegurl'])
})

test('a browser with neither media source nor HLS cannot take a recording transcoded as it plays', (context) => {
  given(context, 'MediaSource', undefined)
  given(context, 'ManagedMediaSource', undefined)

  assert.equal(recordingCarriage(answering('').video), 'none')
})
