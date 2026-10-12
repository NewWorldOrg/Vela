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
  const fonts = [{ family: 'Denpa Font', bytes: new ArrayBuffer(4) }]
  const said: unknown[] = [
    { kind: 'catalog', catalog: CATALOG },
    { kind: 'module', module: carried },
    { kind: 'font', fonts },
    { kind: 'key', key: 'yellow' },
    { kind: 'clock', seconds: 12.5 },
    {
      kind: 'programme',
      programme: {
        service: 1024,
        event: 7,
        network: 32736,
        stream: null,
        startsAt: null,
      },
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
      fonts: [{ family: 'Denpa Font', bytes: new Uint8Array(1) }],
    },
    {
      kind: 'font',
      fonts: [
        {
          family: 'Denpa Font',
          bytes: new ArrayBuffer(4 * 1024 * 1024 + 1),
        },
      ],
    },
    { kind: 'key', key: 'escape' },
    { kind: 'clock', seconds: Number.NaN },
    {
      kind: 'programme',
      programme: {
        service: 'x',
        event: null,
        network: null,
        stream: null,
        startsAt: null,
      },
    },
    {
      kind: 'programme',
      programme: {
        service: 1,
        event: 1.5,
        network: null,
        stream: null,
        startsAt: null,
      },
    },
  ]

  for (const data of dropped) {
    assert.equal(fromPlayer(data), null, JSON.stringify(data))
  }
})

test('the runtime’s memory and script messages are taken when they fit, and dropped when they do not', () => {
  const taken: unknown[] = [
    {
      kind: 'memory',
      name: 'visits',
      value: '{"structure":"U:8B","data":[1]}',
    },
    { kind: 'memory', name: 'visits', value: null },
    { kind: 'script', state: 'running' },
    { kind: 'script', state: 'done' },
    { kind: 'script', state: 'overran' },
  ]
  const dropped: unknown[] = [
    { kind: 'memory', name: '', value: 'x' },
    { kind: 'memory', name: 'x'.repeat(257), value: 'x' },
    { kind: 'memory', name: 'visits', value: 'x'.repeat(64 * 1024 + 1) },
    { kind: 'memory', name: 'visits', value: 1 },
    { kind: 'script', state: 'slow' },
    { kind: 'script' },
  ]

  for (const data of taken) {
    assert.deepEqual(fromRuntime(data), data)
  }

  for (const data of dropped) {
    assert.equal(fromRuntime(data), null, JSON.stringify(data).slice(0, 40))
  }
})

test('the player’s memory and event messages are taken when they fit, and dropped when they do not', () => {
  const fromPlayer = (data: unknown) =>
    playerMessageFrom(
      { origin: 'https://vela.example', source: ELSEWHERE, data },
      { origin: 'https://vela.example', window: ELSEWHERE },
    )
  const event = {
    group: 0,
    id: 7,
    type: 1,
    immediate: true,
    at: 90000,
    privateData: new Uint8Array([1, 2]),
  }

  assert.deepEqual(fromPlayer({ kind: 'memory', entries: [['a', 'b']] }), {
    kind: 'memory',
    entries: [['a', 'b']],
  })
  assert.deepEqual(fromPlayer({ kind: 'memory', entries: [] }), {
    kind: 'memory',
    entries: [],
  })
  assert.deepEqual(fromPlayer({ kind: 'event', event }), {
    kind: 'event',
    event,
  })
  assert.deepEqual(
    fromPlayer({
      kind: 'npt',
      reading: { tag: 0x40, milliseconds: 5_000, rate: 1 },
    }),
    { kind: 'npt', reading: { tag: 0x40, milliseconds: 5_000, rate: 1 } },
  )

  const dropped: unknown[] = [
    { kind: 'memory', entries: [['a']] },
    { kind: 'memory', entries: [['', 'b']] },
    { kind: 'memory', entries: [[1, 'b']] },
    { kind: 'memory', entries: Array.from({ length: 1025 }, () => ['a', 'b']) },
    { kind: 'memory' },
    { kind: 'event', event: { ...event, group: 70000 } },
    { kind: 'event', event: { ...event, at: -1 } },
    { kind: 'event', event: { ...event, privateData: [1, 2] } },
    { kind: 'event' },
    { kind: 'npt', reading: { tag: 0x40, milliseconds: -1, rate: 1 } },
    { kind: 'npt' },
  ]

  for (const data of dropped) {
    assert.equal(fromPlayer(data), null, JSON.stringify(data).slice(0, 40))
  }
})

test('the runtime’s requests over the line are taken when they ask an http or https URL within the limits', () => {
  const said: unknown[] = [
    {
      kind: 'transmit',
      id: 1,
      uri: 'http://example.test/a?b=1',
      text: 'x=1',
      charset: 'EUC-JP',
    },
    { kind: 'fetch', id: 2, uri: 'https://example.test/top.bml' },
    { kind: 'line', said: 'off' },
    { kind: 'line', said: 'unreached' },
  ]

  for (const data of said) {
    assert.deepEqual(fromRuntime(data), data)
  }

  const dropped: unknown[] = [
    {
      kind: 'transmit',
      id: 0,
      uri: 'http://example.test/',
      text: '',
      charset: 'EUC-JP',
    },
    {
      kind: 'transmit',
      id: 1,
      uri: 'ftp://example.test/',
      text: '',
      charset: 'EUC-JP',
    },
    {
      kind: 'transmit',
      id: 1,
      uri: 'http://example.test/#a',
      text: '',
      charset: 'EUC-JP',
    },
    { kind: 'transmit', id: 1, uri: '/40/0000/a', text: '', charset: 'EUC-JP' },
    {
      kind: 'transmit',
      id: 1,
      uri: 'http://example.test/',
      text: 'x'.repeat(16 * 1024 + 1),
      charset: 'EUC-JP',
    },
    {
      kind: 'transmit',
      id: 1,
      uri: 'http://example.test/',
      text: 3,
      charset: 'EUC-JP',
    },
    { kind: 'fetch', id: 1.5, uri: 'http://example.test/' },
    { kind: 'fetch', id: 1, uri: 'javascript:alert(1)' },
    { kind: 'line', said: 'on' },
  ]

  for (const data of dropped) {
    assert.equal(fromRuntime(data), null, JSON.stringify(data))
  }
})

test('the player’s line, answers and fetched modules are taken when they fit, and dropped when they do not', () => {
  const carried = {
    tag: 0,
    id: 0,
    version: 0,
    resources: [{ path: 'top.bml', kind: 'bml', body: new Uint8Array([1]) }],
  }
  const said: unknown[] = [
    {
      kind: 'line',
      line: 'on',
      receiverId: { caSystemId: 5, cardId: 'a1b2c3d4e5f6' },
    },
    { kind: 'line', line: 'off', receiverId: null },
    { kind: 'line', line: 'none', receiverId: null },
    {
      kind: 'transmitted',
      id: 1,
      answer: { result: 1, status: 404, body: 'not here' },
    },
    { kind: 'fetched', id: 2, module: carried },
    { kind: 'fetched', id: 3, module: null },
  ]

  for (const data of said) {
    assert.deepEqual(fromPlayer(data), data)
  }

  const failed = fromPlayer({
    kind: 'transmitted',
    id: 1,
    answer: { result: Number.NaN, status: Number.NaN, body: '' },
  })

  assert.equal(failed?.kind, 'transmitted')

  const dropped: unknown[] = [
    { kind: 'line', line: 'maybe', receiverId: null },
    { kind: 'line', line: 'on', receiverId: '1234' },
    { kind: 'line', line: 'on', receiverId: 'a1b2c3d4e5f6' },
    {
      kind: 'line',
      line: 'on',
      receiverId: { caSystemId: 5, cardId: '1234' },
    },
    {
      kind: 'line',
      line: 'on',
      receiverId: { caSystemId: 0, cardId: 'a1b2c3d4e5f6' },
    },
    {
      kind: 'line',
      line: 'on',
      receiverId: { caSystemId: 0x10000, cardId: 'a1b2c3d4e5f6' },
    },
    { kind: 'line', line: 'on' },
    {
      kind: 'transmitted',
      id: 1,
      answer: { result: 1.5, status: 200, body: '' },
    },
    {
      kind: 'transmitted',
      id: 1,
      answer: { result: Number.POSITIVE_INFINITY, status: 200, body: '' },
    },
    { kind: 'transmitted', id: 1, answer: { result: 1, status: 200 } },
    {
      kind: 'transmitted',
      id: 0,
      answer: { result: 1, status: 200, body: '' },
    },
    { kind: 'fetched', id: 2, module: { tag: 0 } },
  ]

  for (const data of dropped) {
    assert.equal(fromPlayer(data), null, JSON.stringify(data))
  }
})
