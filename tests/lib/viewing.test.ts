import assert from 'node:assert/strict'
import { test } from 'node:test'

import { cookieIn } from '@/lib/stored-flag'
import { viewingSettingsOf } from '@/lib/viewing'

const JAR =
  'vela-theme-mode=dark; vela-data-broadcast-network=allows; vela-data-broadcast-receiver-id=hands'

test('the viewing settings read from the request’s cookies and from the browser’s own are the same', () => {
  const request = new Map(
    JAR.split('; ').map((pair) => pair.split('=') as [string, string]),
  )

  assert.deepEqual(
    viewingSettingsOf((key) => request.get(key)),
    viewingSettingsOf((key) => cookieIn(JAR, key)),
  )
  assert.deepEqual(
    viewingSettingsOf((key) => cookieIn(JAR, key)),
    {
      autoOpensDataBroadcast: false,
      allowsTheLine: true,
      handsTheReceiverId: true,
    },
  )
})

test('a setting with no cookie, or a cookie saying anything but yes, starts off', () => {
  assert.deepEqual(
    viewingSettingsOf(() => undefined),
    {
      autoOpensDataBroadcast: false,
      allowsTheLine: false,
      handsTheReceiverId: false,
    },
  )
  assert.deepEqual(
    viewingSettingsOf(
      (key) =>
        ({
          'vela-data-broadcast-auto-open': 'waits',
          'vela-data-broadcast-network': 'Allows',
          'vela-data-broadcast-receiver-id': 'keeps',
        })[key],
    ),
    {
      autoOpensDataBroadcast: false,
      allowsTheLine: false,
      handsTheReceiverId: false,
    },
  )
})
