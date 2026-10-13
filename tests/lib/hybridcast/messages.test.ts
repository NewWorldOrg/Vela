import assert from 'node:assert/strict'
import { test } from 'node:test'

import { SHARED_REGISTERS } from '@/lib/bml/messages'
import {
  APP_ORIGIN,
  appHelloFrom,
  appMessageOf,
  appRectOf,
  appStateOf,
  frameNameOf,
  receiverMessageOf,
  type AppState,
} from '@/lib/hybridcast/messages'

const RELAY = '/api/live/32736-1024/data-broadcast/app/a-ticket'

const STATE: AppState = {
  application: {
    ait: 'http://hc.example.test/p/app.ait',
    orgId: 16,
    appId: 1,
    controlCode: 1,
    entryUrl: 'http://hc.example.test/p/index.html',
    boundary: [
      { permissionBitmap: 0x1fff, managedUrls: ['http://example.test'] },
    ],
  },
  greg: Array.from({ length: SHARED_REGISTERS }, (_, at) =>
    at === 44 ? 'back' : '',
  ),
  memory: [['nvram://~/local/a', 'AAAA']],
  programme: {
    networkId: 32736,
    serviceId: 1024,
    now: { eventId: 1, startsAt: 0, duration: 60, name: 'a', description: '' },
    next: null,
  },
  name: '',
}

test('the state a frame carries in its name is read back whole, and a name the player did not give is none', () => {
  assert.deepEqual(appStateOf(frameNameOf(STATE)), STATE)
  assert.deepEqual(appStateOf(frameNameOf({ ...STATE, programme: null })), {
    ...STATE,
    programme: null,
  })
  assert.equal(appStateOf(''), null)
  assert.equal(appStateOf('vela-hybridcast:{'), null)
  assert.equal(appStateOf(frameNameOf({ ...STATE, greg: ['a'] })), null)
  assert.equal(
    appStateOf(
      frameNameOf({
        ...STATE,
        application: { ...STATE.application, entryUrl: 'javascript:1' },
      }),
    ),
    null,
  )
})

test('the video rectangle is one of the 1920x1080 coordinates with a size, or none', () => {
  assert.deepEqual(appRectOf({ left: 960, top: 0, width: 960, height: 540 }), {
    left: 960,
    top: 0,
    width: 960,
    height: 540,
  })
  assert.equal(appRectOf({ left: 961, top: 0, width: 960, height: 540 }), null)
  assert.equal(appRectOf({ left: 0, top: 0, width: 0, height: 540 }), null)
  assert.equal(appRectOf({ left: '0', top: 0, width: 10, height: 10 }), null)
})

test('what the application says is taken only in the shapes there are', () => {
  assert.deepEqual(
    appMessageOf({ kind: 'videoRect', rect: null, over: true }),
    {
      kind: 'videoRect',
      rect: null,
      over: true,
    },
  )
  assert.equal(
    appMessageOf({ kind: 'videoRect', rect: { left: -1 }, over: true }),
    null,
  )
  assert.deepEqual(appMessageOf({ kind: 'keySet', mask: 0x811 }), {
    kind: 'keySet',
    mask: 0x811,
  })
  assert.equal(appMessageOf({ kind: 'keySet', mask: 'all' }), null)
  assert.deepEqual(appMessageOf({ kind: 'greg', greg: STATE.greg }), {
    kind: 'greg',
    greg: STATE.greg,
  })
  assert.equal(appMessageOf({ kind: 'greg', greg: [] }), null)
  assert.deepEqual(appMessageOf({ kind: 'memory', name: 'a', value: null }), {
    kind: 'memory',
    name: 'a',
    value: null,
  })
  assert.equal(appMessageOf({ kind: 'memory', name: '', value: 'x' }), null)
  assert.deepEqual(appMessageOf({ kind: 'destroy' }), { kind: 'destroy' })
  assert.deepEqual(appMessageOf({ kind: 'loaded' }), { kind: 'loaded' })
  assert.deepEqual(appMessageOf({ kind: 'leave' }), { kind: 'leave' })
  assert.deepEqual(appMessageOf({ kind: 'launchBml', componentTag: 0x60 }), {
    kind: 'launchBml',
    componentTag: 0x60,
  })
  assert.deepEqual(appMessageOf({ kind: 'launchBml', componentTag: null }), {
    kind: 'launchBml',
    componentTag: null,
  })
  assert.equal(appMessageOf({ kind: 'launchBml', componentTag: 256 }), null)
  assert.deepEqual(
    appMessageOf({
      kind: 'replace',
      start: { ait: 'http://hc.example.test/b.ait', orgId: 18, appId: 2 },
    }),
    {
      kind: 'replace',
      start: { ait: 'http://hc.example.test/b.ait', orgId: 18, appId: 2 },
    },
  )
  assert.equal(appMessageOf({ kind: 'replace', start: { ait: 'x' } }), null)
  assert.equal(appMessageOf({ kind: 'tune' }), null)
  assert.equal(appMessageOf('destroy'), null)
})

test('a document is taken as opened only from the player own frame, in an opaque origin, on its relay, with one port', () => {
  const frame = {}
  const port = {} as MessagePort
  const hello = {
    origin: APP_ORIGIN,
    source: frame,
    data: {
      kind: 'hello',
      relay: RELAY,
      document: 'http://hc.example.test/p/index.html',
    },
    ports: [port],
  }

  assert.deepEqual(appHelloFrom(hello, frame, RELAY), {
    document: 'http://hc.example.test/p/index.html',
    port,
  })
  assert.equal(appHelloFrom({ ...hello, source: {} }, frame, RELAY), null)
  assert.equal(appHelloFrom(hello, null, RELAY), null)
  assert.equal(
    appHelloFrom({ ...hello, origin: 'https://vela.example' }, frame, RELAY),
    null,
  )
  assert.equal(appHelloFrom({ ...hello, ports: [] }, frame, RELAY), null)
  assert.equal(
    appHelloFrom(hello, frame, '/api/live/32736-1024/data-broadcast/app/other'),
    null,
  )
  assert.equal(
    appHelloFrom(
      { ...hello, data: { ...hello.data, document: 'about:blank' } },
      frame,
      RELAY,
    ),
    null,
  )
})

test('what the player tells the document is taken only in the shapes there are', () => {
  assert.deepEqual(
    receiverMessageOf({
      kind: 'welcome',
      receiverId: { caSystemId: 5, cardId: '0123456789AB' },
      npt: [{ tag: 0x40, milliseconds: 1000, rate: 1 }],
    }),
    {
      kind: 'welcome',
      receiverId: { caSystemId: 5, cardId: '0123456789AB' },
      npt: [{ tag: 0x40, milliseconds: 1000, rate: 1 }],
    },
  )
  assert.deepEqual(
    receiverMessageOf({ kind: 'welcome', receiverId: null, npt: [] }),
    {
      kind: 'welcome',
      receiverId: null,
      npt: [],
    },
  )
  assert.equal(
    receiverMessageOf({
      kind: 'welcome',
      receiverId: { cardId: 'x' },
      npt: [],
    }),
    null,
  )
  assert.deepEqual(receiverMessageOf({ kind: 'key', key: 'red' }), {
    kind: 'key',
    key: 'red',
  })
  assert.equal(receiverMessageOf({ kind: 'key', key: 'power' }), null)
  assert.deepEqual(receiverMessageOf({ kind: 'programme', programme: null }), {
    kind: 'programme',
    programme: null,
  })
  assert.deepEqual(
    receiverMessageOf({ kind: 'programme', programme: STATE.programme }),
    {
      kind: 'programme',
      programme: STATE.programme,
    },
  )
  assert.equal(receiverMessageOf({ kind: 'programme', programme: {} }), null)
  assert.deepEqual(receiverMessageOf({ kind: 'checkLoaded' }), {
    kind: 'checkLoaded',
  })
  assert.equal(receiverMessageOf({ kind: 'open' }), null)
})
