import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'

import { liveCarriage } from '@/components/live/live-carriage'

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

test('a browser with a media source is fed, and is never asked about playlists', (context) => {
  given(context, 'MediaSource', Source)
  const probe = answering('maybe')

  assert.equal(liveCarriage(probe.video), 'feed')
  assert.deepEqual(probe.asked, [])
})

test('a browser with only the managed media source is fed too', (context) => {
  given(context, 'MediaSource', undefined)
  given(context, 'ManagedMediaSource', Source)

  assert.equal(liveCarriage(answering('').video), 'feed')
})

test('a browser with neither media source is handed the playlist when its video plays HLS', (context) => {
  given(context, 'MediaSource', undefined)
  given(context, 'ManagedMediaSource', undefined)
  const probe = answering('maybe')

  assert.equal(liveCarriage(probe.video), 'playlist')
  assert.deepEqual(probe.asked, ['application/vnd.apple.mpegurl'])
})

test('a browser with neither media source nor HLS cannot take a live channel', (context) => {
  given(context, 'MediaSource', undefined)
  given(context, 'ManagedMediaSource', undefined)

  assert.equal(liveCarriage(answering('').video), 'none')
})
