import assert from 'node:assert/strict'
import { test } from 'node:test'

import { describeDevice } from '@/lib/device'

const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'

const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'

const WEBKIT = 'AppleWebKit/537.36 (KHTML, like Gecko)'

test('an empty label is an unnamed device, said without a kind', () => {
  for (const label of ['', '   ']) {
    assert.deepEqual(describeDevice(label), { name: '不明な端末' })
  }
})

test('a desktop browser is named with the system it runs on', () => {
  assert.deepEqual(
    describeDevice(`${WINDOWS} ${WEBKIT} Chrome/150.0.0.0 Safari/537.36`),
    { name: 'Chrome / Windows', kind: 'デスクトップ' },
  )
  assert.deepEqual(describeDevice(`${MAC} Gecko/20100101 Firefox/140.0`), {
    name: 'Firefox / macOS',
    kind: 'デスクトップ',
  })
  assert.deepEqual(
    describeDevice(
      `${MAC} AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15`,
    ),
    { name: 'Safari / macOS', kind: 'デスクトップ' },
  )
  assert.deepEqual(
    describeDevice(
      `Mozilla/5.0 (X11; CrOS x86_64 16000.0.0) ${WEBKIT} Chrome/150.0.0.0 Safari/537.36`,
    ),
    { name: 'Chrome / ChromeOS', kind: 'デスクトップ' },
  )
  assert.deepEqual(
    describeDevice(
      'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',
    ),
    { name: 'Firefox / Linux', kind: 'デスクトップ' },
  )
})

test('a browser built on another is named as itself, not as the one beneath', () => {
  const chromium = `${WINDOWS} ${WEBKIT} Chrome/150.0.0.0 Safari/537.36`

  assert.equal(
    describeDevice(`${chromium} Edg/150.0.0.0`).name,
    'Edge / Windows',
  )
  assert.equal(
    describeDevice(`${chromium} OPR/120.0.0.0`).name,
    'Opera / Windows',
  )
})

test('a phone and a tablet are told apart, with the Apple system its version', () => {
  assert.deepEqual(
    describeDevice(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 19_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.1 Mobile/15E148 Safari/604.1',
    ),
    { name: 'Safari / iOS 19', kind: 'スマートフォン' },
  )
  assert.deepEqual(
    describeDevice(
      'Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/150.0.0.0 Mobile/15E148 Safari/604.1',
    ),
    { name: 'Chrome / iPadOS 18', kind: 'タブレット' },
  )
  assert.deepEqual(
    describeDevice(
      `Mozilla/5.0 (Linux; Android 16; Pixel) ${WEBKIT} Chrome/150.0.0.0 Mobile Safari/537.36`,
    ),
    { name: 'Chrome / Android 16', kind: 'スマートフォン' },
  )
  assert.deepEqual(
    describeDevice(
      `Mozilla/5.0 (Linux; Android 15; Tablet) ${WEBKIT} Chrome/150.0.0.0 Safari/537.36`,
    ),
    { name: 'Chrome / Android 15', kind: 'タブレット' },
  )
})

test('a player that is not a browser is named by its product and said to be one', () => {
  assert.deepEqual(describeDevice('  VLC/3.0.21 LibVLC/3.0.21 '), {
    name: 'VLC',
    kind: '外部プレイヤー',
  })
  assert.deepEqual(
    describeDevice('Kodi/21.2 (Windows NT 10.0; Win64; x64) App_Bitness/64'),
    { name: 'Kodi / Windows', kind: '外部プレイヤー' },
  )
})

test('a system with no browser or product named is named by the system alone', () => {
  assert.deepEqual(
    describeDevice('(iPhone; CPU iPhone OS 19_1 like Mac OS X)'),
    {
      name: 'iOS 19',
      kind: 'スマートフォン',
    },
  )
})

test('a label that names nothing this build reads is an unnamed device', () => {
  for (const label of ['something', '(unknown; device)', '42']) {
    assert.deepEqual(describeDevice(label), { name: '不明な端末' }, label)
  }
})

test('a browser on a system this build does not read is named without one', () => {
  assert.deepEqual(
    describeDevice('Mozilla/5.0 (SomeOS 1.0) Gecko/20100101 Firefox/140.0'),
    { name: 'Firefox', kind: undefined },
  )
})
