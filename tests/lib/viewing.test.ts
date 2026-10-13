import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  DATA_BROADCAST_HYBRIDCAST,
  HYBRIDCAST_SPELLING,
  cookieIn,
} from '@/lib/stored-flag'
import { viewingSettingsOf } from '@/lib/viewing'

const JAR =
  'vela-theme-mode=dark; vela-data-broadcast-network=allows; vela-data-broadcast-receiver-id=hands; vela-data-broadcast-hybridcast=allows'

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
      allowsHybridcast: true,
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
      allowsHybridcast: false,
    },
  )
  assert.deepEqual(
    viewingSettingsOf(
      (key) =>
        ({
          'vela-data-broadcast-auto-open': 'waits',
          'vela-data-broadcast-network': 'Allows',
          'vela-data-broadcast-receiver-id': 'keeps',
          'vela-data-broadcast-hybridcast': 'Allows',
        })[key],
    ),
    {
      autoOpensDataBroadcast: false,
      allowsTheLine: false,
      handsTheReceiverId: false,
      allowsHybridcast: false,
    },
  )
})

test('the Hybridcast setting is kept under the cookie Carina reads, saying allows', () => {
  assert.equal(DATA_BROADCAST_HYBRIDCAST, 'vela-data-broadcast-hybridcast')
  assert.equal(HYBRIDCAST_SPELLING.yes, 'allows')
  assert.equal(
    viewingSettingsOf((key) =>
      key === 'vela-data-broadcast-hybridcast' ? 'allows' : undefined,
    ).allowsHybridcast,
    true,
  )
})
