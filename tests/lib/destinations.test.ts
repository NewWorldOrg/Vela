import assert from 'node:assert/strict'
import { test } from 'node:test'

import { DESTINATIONS, destinationOf } from '@/lib/destinations'

test('the five destinations are the guide, live, the library, reservations and the settings, in that order', () => {
  assert.deepEqual(
    DESTINATIONS.map(({ href, label }) => [href, label]),
    [
      ['/guide', '番組表'],
      ['/live', 'ライブ'],
      ['/library', 'ライブラリ'],
      ['/reservations', '予約'],
      ['/settings', '設定'],
    ],
  )
})

test('a screen belongs to the destination it is reached from', () => {
  assert.equal(destinationOf('/guide'), '/guide')
  assert.equal(destinationOf('/guide/programs/32736-1024-100'), '/guide')
  assert.equal(destinationOf('/search'), '/guide')
  assert.equal(destinationOf('/live'), '/live')
  assert.equal(destinationOf('/library'), '/library')
  assert.equal(destinationOf('/recordings/1266'), '/library')
  assert.equal(destinationOf('/reservations/rules'), '/reservations')
  assert.equal(destinationOf('/settings/tuners'), '/settings')
})

test('a screen outside every destination marks none of them', () => {
  assert.equal(destinationOf('/'), null)
  assert.equal(destinationOf('/guidebook'), null)
  assert.equal(destinationOf('/settingsx'), null)
})
