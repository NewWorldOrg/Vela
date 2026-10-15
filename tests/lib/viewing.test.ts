import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  DATA_BROADCAST_HYBRIDCAST,
  DATA_BROADCAST_SOUNDS,
  HYBRIDCAST_SPELLING,
  SOUNDS_SPELLING,
  cookieIn,
} from '@/lib/stored-flag'
import { viewingSettingsOf } from '@/lib/viewing'

const JAR =
  'vela-theme-mode=dark; vela-data-broadcast-network=allows; vela-data-broadcast-receiver-id=hands; vela-data-broadcast-hybridcast=allows; vela-data-broadcast-sounds=silent'

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
      playsSounds: false,
    },
  )
})

test('a setting with no cookie starts as it is by default: the sounds on and the rest off', () => {
  assert.deepEqual(
    viewingSettingsOf(() => undefined),
    {
      autoOpensDataBroadcast: false,
      allowsTheLine: false,
      handsTheReceiverId: false,
      allowsHybridcast: false,
      playsSounds: true,
    },
  )
})

test('a cookie saying anything but yes reads as off', () => {
  assert.deepEqual(
    viewingSettingsOf(
      (key) =>
        ({
          'vela-data-broadcast-auto-open': 'waits',
          'vela-data-broadcast-network': 'Allows',
          'vela-data-broadcast-receiver-id': 'keeps',
          'vela-data-broadcast-hybridcast': 'Allows',
          'vela-data-broadcast-sounds': 'Plays',
        })[key],
    ),
    {
      autoOpensDataBroadcast: false,
      allowsTheLine: false,
      handsTheReceiverId: false,
      allowsHybridcast: false,
      playsSounds: false,
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

test('the sounds setting is kept under its own cookie, saying plays or silent', () => {
  assert.equal(DATA_BROADCAST_SOUNDS, 'vela-data-broadcast-sounds')
  assert.deepEqual(SOUNDS_SPELLING, { yes: 'plays', no: 'silent' })
  assert.equal(
    viewingSettingsOf((key) =>
      key === DATA_BROADCAST_SOUNDS ? 'plays' : undefined,
    ).playsSounds,
    true,
  )
  assert.equal(
    viewingSettingsOf((key) =>
      key === DATA_BROADCAST_SOUNDS ? 'silent' : undefined,
    ).playsSounds,
    false,
  )
})
