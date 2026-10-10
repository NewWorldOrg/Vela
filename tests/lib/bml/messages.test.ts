import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { BmlCatalog } from '@/lib/bml/catalog'
import {
  RUNTIME_ORIGIN,
  gridRectOf,
  playerMessageFrom,
  runtimeMessageFrom,
} from '@/lib/bml/messages'

const FRAME = { name: 'the runtime frame' }

const ELSEWHERE = { name: 'another window' }

const fromRuntime = (
  data: unknown,
  origin = RUNTIME_ORIGIN,
  source: unknown = FRAME,
) => runtimeMessageFrom({ origin, source, data }, FRAME)

test('what the runtime may say is taken from its own frame in its opaque origin', () => {
  const said: unknown[] = [
    {
      kind: 'videoRect',
      rect: { left: 560, top: 60, width: 360, height: 202.5 },
    },
    { kind: 'videoRect', rect: null },
    { kind: 'usedKeys', keys: ['up', 'enter', 'blue', '0'] },
    { kind: 'waiting', waiting: true },
    { kind: 'unsupported', what: 'script' },
    { kind: 'exit' },
    { kind: 'error', reason: 'malformed' },
  ]

  for (const data of said) {
    assert.deepEqual(fromRuntime(data), data)
  }
})

test('a message from another origin or another window is not the runtime’s', () => {
  const data = { kind: 'exit' }

  assert.equal(fromRuntime(data, 'https://vela.example'), null)
  assert.equal(fromRuntime(data, RUNTIME_ORIGIN, ELSEWHERE), null)
  assert.equal(fromRuntime(data, RUNTIME_ORIGIN, null), null)
  assert.equal(
    runtimeMessageFrom({ origin: RUNTIME_ORIGIN, source: null, data }, null),
    null,
  )
})

test('a kind the runtime may not say, or a shape that does not fit, is dropped', () => {
  const dropped: unknown[] = [
    null,
    'exit',
    { kind: 'navigate', to: '/' },
    { kind: 'cookie' },
    { kind: 'usedKeys', keys: ['up', 'escape'] },
    { kind: 'usedKeys', keys: 'up' },
    { kind: 'waiting', waiting: 'yes' },
    { kind: 'unsupported', what: 7 },
    { kind: 'unsupported', what: 'x'.repeat(65) },
    { kind: 'error', reason: 'anything' },
    { kind: 'videoRect' },
  ]

  for (const data of dropped) {
    assert.equal(fromRuntime(data), null, JSON.stringify(data))
  }
})

test('a broken rectangle is dropped: not numbers, not finite, negative, empty or past the 960x540 grid', () => {
  const broken: unknown[] = [
    { left: '0', top: 0, width: 10, height: 10 },
    { left: 0, top: 0, width: Number.NaN, height: 10 },
    { left: 0, top: 0, width: Number.POSITIVE_INFINITY, height: 10 },
    { left: -1, top: 0, width: 10, height: 10 },
    { left: 0, top: 0, width: 0, height: 10 },
    { left: 900, top: 0, width: 61, height: 10 },
    { left: 0, top: 500, width: 10, height: 41 },
    [0, 0, 10, 10],
  ]

  for (const rect of broken) {
    assert.equal(gridRectOf(rect), null, JSON.stringify(rect))
    assert.equal(fromRuntime({ kind: 'videoRect', rect }), null)
  }

  assert.deepEqual(gridRectOf({ left: 0, top: 0, width: 960, height: 540 }), {
    left: 0,
    top: 0,
    width: 960,
    height: 540,
  })
})

test('a duplicated key is said once', () => {
  assert.deepEqual(fromRuntime({ kind: 'usedKeys', keys: ['up', 'up'] }), {
    kind: 'usedKeys',
    keys: ['up'],
  })
})

const VELA = 'https://vela.example'

const PARENT = { name: 'the player' }

const fromPlayer = (data: unknown, origin = VELA, source: unknown = PARENT) =>
  playerMessageFrom({ origin, source, data }, { origin: VELA, window: PARENT })

const CATALOG: BmlCatalog = {
  service: 1,
  entryTag: 0x40,
  autoStart: false,
  startup: '/40/0000/startup.bml',
  carousels: [],
}

test('what the player may say is taken from the parent window in Vela’s origin', () => {
  const carried = {
    tag: 0x40,
    id: 0,
    version: 1,
    resources: [{ path: 'a.bml', kind: 'bml', body: new Uint8Array([1]) }],
  }
  const fonts = [{ family: 'Data Broadcast', bytes: new ArrayBuffer(4) }]
  const said: unknown[] = [
    { kind: 'catalog', catalog: CATALOG },
    { kind: 'module', module: carried },
    { kind: 'font', fonts },
    { kind: 'key', key: 'yellow' },
    { kind: 'clock', seconds: 12.5 },
    {
      kind: 'programme',
      programme: { service: 1024, event: 7, startsAt: null },
    },
    { kind: 'open' },
    { kind: 'close' },
  ]

  for (const data of said) {
    assert.deepEqual(fromPlayer(data), data)
  }
})

test('a message from another origin or window, or before the player’s origin is known, is not the player’s', () => {
  const data = { kind: 'open' }

  assert.equal(fromPlayer(data, 'null'), null)
  assert.equal(fromPlayer(data, 'https://elsewhere.example'), null)
  assert.equal(fromPlayer(data, VELA, ELSEWHERE), null)
  assert.equal(
    playerMessageFrom(
      { origin: '', source: PARENT, data },
      { origin: '', window: PARENT },
    ),
    null,
  )
})

test('a kind the player may not say, or a shape that does not fit, is dropped', () => {
  const dropped: unknown[] = [
    { kind: 'eval', source: '1' },
    { kind: 'catalog', catalog: { ...CATALOG, startup: 1 } },
    { kind: 'module', module: { tag: 0x40 } },
    {
      kind: 'font',
      fonts: [{ family: 'Comic Sans', bytes: new ArrayBuffer(1) }],
    },
    {
      kind: 'font',
      fonts: [{ family: 'Data Broadcast', bytes: new Uint8Array(1) }],
    },
    {
      kind: 'font',
      fonts: [
        {
          family: 'Data Broadcast',
          bytes: new ArrayBuffer(4 * 1024 * 1024 + 1),
        },
      ],
    },
    { kind: 'key', key: 'escape' },
    { kind: 'clock', seconds: Number.NaN },
    {
      kind: 'programme',
      programme: { service: 'x', event: null, startsAt: null },
    },
    {
      kind: 'programme',
      programme: { service: 1, event: 1.5, startsAt: null },
    },
  ]

  for (const data of dropped) {
    assert.equal(fromPlayer(data), null, JSON.stringify(data))
  }
})
