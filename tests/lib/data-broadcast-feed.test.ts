import assert from 'node:assert/strict'
import { test } from 'node:test'

import { catalogPayload, type BmlCatalog } from '@/lib/bml/catalog'
import { modulePayload, type BmlModule } from '@/lib/bml/resources'
import {
  DataBroadcastFeed,
  MOST_HELD_BYTES,
  MOST_HELD_EVENTS,
  MOST_MODULE_BYTES,
  MOST_WAITING_FRAMES,
  readDataBroadcast,
  type DataBroadcastChange,
} from '@/lib/data-broadcast-feed'
import { PTS_HERTZ } from '@/lib/live-wire'

const at = (seconds: number) => seconds * PTS_HERTZ

const CATALOG: BmlCatalog = {
  service: 1024,
  entryTag: 0x40,
  autoStart: false,
  startup: '/40/0000/startup.bml',
  carousels: [
    {
      tag: 0x40,
      downloadId: 7,
      modules: [
        {
          id: 0,
          version: 1,
          size: 40,
          resources: [{ path: 'startup.bml', type: 'text/X-arib-bml' }],
        },
        { id: 1, version: 1, size: 30, resources: [] },
      ],
    },
    { tag: 0x72, downloadId: 0, modules: [] },
  ],
}

function moduleOf(id: number, version = 1, body = '<bml/>'): BmlModule {
  return {
    tag: 0x40,
    id,
    version,
    resources: [
      {
        path: id === 0 ? 'startup.bml' : `page${id}.bml`,
        kind: 'bml',
        body: new TextEncoder().encode(body),
      },
    ],
  }
}

const NONE = Uint8Array.of(0x04)

function eventPayload({
  group = 1,
  id = 2,
  type = 3,
  timeKind = 1,
  fires = at(10),
  data = [0xaa, 0xbb],
}: {
  group?: number
  id?: number
  type?: number
  timeKind?: number
  fires?: number
  data?: number[]
} = {}): Uint8Array {
  const payload = new Uint8Array(19 + data.length)
  const view = new DataView(payload.buffer)

  payload[0] = 0x03
  view.setUint16(1, group)
  view.setUint16(3, id)
  payload[5] = type
  payload[6] = timeKind
  view.setUint32(7, Math.floor(fires / 2 ** 32))
  view.setUint32(11, fires % 2 ** 32)
  view.setUint16(17, data.length)
  payload.set(data, 19)

  return payload
}

function sizedModule(id: number, bytes: number): Uint8Array {
  const payload = new Uint8Array(bytes)
  const view = new DataView(payload.buffer)
  const path = new TextEncoder().encode('big.bin')

  payload[0] = 0x02
  payload[1] = 0x40
  view.setUint16(2, id)
  payload[4] = 1
  view.setUint16(5, path.length)
  payload.set(path, 7)
  payload[7 + path.length] = 6
  view.setUint32(8 + path.length, bytes - (12 + path.length))

  return payload
}

function quietFeed(): { feed: DataBroadcastFeed; warned: string[] } {
  const warned: string[] = []

  return {
    feed: new DataBroadcastFeed((warning) => warned.push(warning)),
    warned,
  }
}

test('each kind of frame is read by its first byte', () => {
  assert.deepEqual(readDataBroadcast(catalogPayload(CATALOG)), {
    said: 'catalog',
    catalog: CATALOG,
  })

  const carried = readDataBroadcast(modulePayload(moduleOf(1)))

  assert.ok(carried.said === 'module')
  assert.equal(carried.module.id, 1)

  assert.deepEqual(readDataBroadcast(NONE), { said: 'none' })
  assert.deepEqual(readDataBroadcast(Uint8Array.of(0x05)), { said: 'unknown' })
  assert.deepEqual(readDataBroadcast(Uint8Array.of(0x04, 0)), {
    said: 'unknown',
  })
  assert.deepEqual(readDataBroadcast(new Uint8Array(0)), { said: 'unknown' })
})

test('an event message is read with its group, id, type, time and private data', () => {
  const said = readDataBroadcast(
    eventPayload({ group: 0x1234, id: 0x5678, type: 2, fires: at(4000) }),
  )

  assert.equal(said.said, 'event')
  assert.ok(said.said === 'event')
  assert.equal(said.event.group, 0x1234)
  assert.equal(said.event.id, 0x5678)
  assert.equal(said.event.type, 2)
  assert.equal(said.event.immediate, true)
  assert.equal(said.event.at, at(4000))
  assert.deepEqual([...said.event.privateData], [0xaa, 0xbb])

  const onTheProgrammeClock = readDataBroadcast(eventPayload({ timeKind: 2 }))

  assert.ok(onTheProgrammeClock.said === 'event')
  assert.equal(onTheProgrammeClock.event.immediate, false)
})

test('an event message with a length that does not match, or an unknown time kind, is not read', () => {
  const short = eventPayload().subarray(0, 20)

  assert.deepEqual(readDataBroadcast(short), { said: 'unknown' })
  assert.deepEqual(readDataBroadcast(eventPayload({ timeKind: 3 })), {
    said: 'unknown',
  })
})

test('a frame waits until the playhead reaches its time', () => {
  const { feed } = quietFeed()

  feed.offer(catalogPayload(CATALOG), at(100))
  feed.advance(99.9)

  assert.equal(feed.catalog, null)
  assert.equal(feed.pending, 1)

  feed.advance(100)

  assert.deepEqual(feed.catalog, CATALOG)
  assert.equal(feed.pending, 0)
})

test('frames sent again to a viewer who joins late are in the past, so they take effect at once', () => {
  const { feed } = quietFeed()

  feed.offer(catalogPayload(CATALOG), at(40))
  feed.offer(modulePayload(moduleOf(0)), at(12))
  feed.offer(modulePayload(moduleOf(1)), at(30))
  feed.advance(55)

  assert.equal(feed.availability, 'ready')
  assert.deepEqual(feed.heldModules.map((module) => module.id).sort(), [0, 1])
})

test('frames take effect in the order of their times, whatever order they arrived in', () => {
  const { feed } = quietFeed()
  const heard: string[] = []

  feed.subscribe((change) => heard.push(change.kind))
  feed.offer(modulePayload(moduleOf(0)), at(20))
  feed.offer(NONE, at(10))
  feed.offer(catalogPayload(CATALOG), at(15))
  feed.advance(20)

  assert.deepEqual(heard, ['none', 'catalog', 'module'])
  assert.equal(feed.availability, 'ready')
})

test('the broadcast cannot be opened until the catalog and its start document are both in', () => {
  const { feed } = quietFeed()

  assert.equal(feed.availability, 'absent')

  feed.offer(catalogPayload(CATALOG), at(1))
  feed.advance(1)
  assert.equal(feed.availability, 'absent')

  feed.offer(modulePayload(moduleOf(1)), at(2))
  feed.advance(2)
  assert.equal(feed.availability, 'absent')

  feed.offer(modulePayload(moduleOf(0)), at(3))
  feed.advance(3)
  assert.equal(feed.availability, 'ready')
})

test('a start document that comes before its catalog counts once the catalog comes', () => {
  const { feed } = quietFeed()

  feed.offer(modulePayload(moduleOf(0)), at(1))
  feed.advance(1)
  assert.equal(feed.availability, 'absent')

  feed.offer(catalogPayload(CATALOG), at(2))
  feed.advance(2)
  assert.equal(feed.availability, 'ready')
})

test('a service with no data broadcast says none, and forgets what was held', () => {
  const { feed } = quietFeed()

  feed.offer(catalogPayload(CATALOG), at(1))
  feed.offer(modulePayload(moduleOf(0)), at(2))
  feed.advance(2)
  feed.offer(NONE, at(3))
  feed.advance(3)

  assert.equal(feed.availability, 'none')
  assert.equal(feed.catalog, null)
  assert.deepEqual(feed.heldModules, [])
  assert.equal(feed.heldBytes, 0)
})

test('after none, a broadcast that starts again can be opened again', () => {
  const { feed } = quietFeed()

  feed.offer(NONE, at(1))
  feed.offer(modulePayload(moduleOf(0)), at(2))
  feed.advance(2)
  assert.equal(feed.availability, 'none')

  feed.offer(catalogPayload(CATALOG), at(3))
  feed.advance(3)
  assert.equal(feed.availability, 'ready')
})

test('a module the catalog no longer lists is let go, and one whose version moved on is held until the new one comes', () => {
  const { feed } = quietFeed()
  const next: BmlCatalog = {
    ...CATALOG,
    carousels: [
      {
        ...CATALOG.carousels[0],
        modules: [{ ...CATALOG.carousels[0].modules[0], version: 2 }],
      },
    ],
  }

  feed.offer(catalogPayload(CATALOG), at(1))
  feed.offer(modulePayload(moduleOf(0)), at(2))
  feed.offer(modulePayload(moduleOf(1)), at(3))
  feed.offer(catalogPayload(next), at(4))
  feed.advance(4)

  assert.deepEqual(
    feed.heldModules.map((module) => [module.id, module.version]),
    [[0, 1]],
  )
  assert.equal(feed.availability, 'ready')

  feed.offer(modulePayload(moduleOf(0, 2)), at(5))
  feed.advance(5)

  assert.deepEqual(
    feed.heldModules.map((module) => [module.id, module.version]),
    [[0, 2]],
  )
  assert.equal(feed.heldBytes, modulePayload(moduleOf(0, 2)).length)
})

test('a catalog that drops the start document leaves the broadcast unopenable', () => {
  const { feed } = quietFeed()

  feed.offer(catalogPayload(CATALOG), at(1))
  feed.offer(modulePayload(moduleOf(0)), at(2))
  feed.offer(
    catalogPayload({
      ...CATALOG,
      carousels: [
        { ...CATALOG.carousels[0], modules: [CATALOG.carousels[0].modules[1]] },
      ],
    }),
    at(3),
  )
  feed.advance(3)

  assert.equal(feed.availability, 'absent')
})

test('a module larger than 16 MiB is dropped with a warning', () => {
  const { feed, warned } = quietFeed()

  feed.offer(sizedModule(0, MOST_MODULE_BYTES + 1), at(1))
  feed.advance(1)

  assert.equal(feed.pending, 0)
  assert.deepEqual(feed.heldModules, [])
  assert.equal(warned.length, 1)

  feed.offer(sizedModule(0, MOST_MODULE_BYTES), at(2))
  feed.advance(2)

  assert.equal(feed.heldBytes, MOST_MODULE_BYTES)
})

test('a module that would take what is held past 64 MiB is dropped with a warning, and one in its place still fits', () => {
  const { feed, warned } = quietFeed()
  const quarter = MOST_HELD_BYTES / 4

  for (const id of [1, 2, 3, 4]) {
    feed.offer(sizedModule(id, quarter), at(1))
    feed.advance(1)
  }

  feed.offer(sizedModule(5, 64), at(2))
  feed.advance(2)

  assert.equal(feed.heldBytes, MOST_HELD_BYTES)
  assert.equal(feed.heldModules.length, 4)
  assert.equal(warned.length, 1)

  feed.offer(sizedModule(4, quarter - 64), at(3))
  feed.advance(3)
  feed.offer(sizedModule(5, 64), at(3))
  feed.advance(3)

  assert.equal(feed.heldBytes, MOST_HELD_BYTES)
  assert.equal(feed.heldModules.length, 5)
})

test('a frame that cannot be read is dropped with a warning', () => {
  const { feed, warned } = quietFeed()

  feed.offer(Uint8Array.of(0x02, 0x40), at(1))
  feed.advance(1)

  assert.equal(feed.pending, 0)
  assert.equal(warned.length, 1)
})

test('event messages are held once each, up to a bound, and change nothing that is shown', () => {
  const { feed } = quietFeed()
  const heard: DataBroadcastChange[] = []

  feed.subscribe((change) => heard.push(change))
  feed.offer(eventPayload({ id: 1 }), at(1))
  feed.offer(eventPayload({ id: 1 }), at(1))
  feed.advance(1)

  assert.equal(feed.events.length, 1)
  assert.deepEqual(heard, [])

  for (let id = 2; id <= MOST_HELD_EVENTS + 5; id += 1) {
    feed.offer(eventPayload({ id }), at(2))
  }

  feed.advance(2)

  assert.equal(feed.events.length, MOST_HELD_EVENTS)
  assert.equal(feed.events[0].id, 6)
})

test('the listener hears each change as it takes effect, and stops when it lets go', () => {
  const { feed } = quietFeed()
  const heard: DataBroadcastChange[] = []
  const letGo = feed.subscribe((change) => heard.push(change))

  feed.offer(catalogPayload(CATALOG), at(1))
  feed.offer(modulePayload(moduleOf(0)), at(2))
  feed.advance(2)

  assert.deepEqual(
    heard.map((change) => change.kind),
    ['catalog', 'module'],
  )

  letGo()
  feed.offer(NONE, at(3))
  feed.advance(3)

  assert.equal(heard.length, 2)
})

test('a reset forgets everything, including what was waiting, and says so', () => {
  const { feed } = quietFeed()
  const heard: string[] = []

  feed.offer(NONE, at(1))
  feed.advance(1)
  feed.offer(catalogPayload(CATALOG), at(9))
  feed.subscribe((change) => heard.push(change.kind))
  feed.reset()

  assert.equal(feed.availability, 'absent')
  assert.equal(feed.pending, 0)
  assert.deepEqual(heard, ['reset'])
})

test('frames that wait while the picture is paused are held to 64 MiB, the oldest let go first', () => {
  const { feed, warned } = quietFeed()
  const quarter = MOST_HELD_BYTES / 4

  for (const id of [1, 2, 3, 4, 5]) {
    feed.offer(sizedModule(id, quarter), at(100 + id))
  }

  assert.equal(feed.pending, 4)
  assert.equal(feed.pendingBytes, MOST_HELD_BYTES)
  assert.equal(warned.length, 1)

  feed.advance(200)

  assert.deepEqual(
    feed.heldModules.map((module) => module.id),
    [2, 3, 4, 5],
  )
})

test('no more frames wait than the count allows, and the newest catalog is never the one let go', () => {
  const { feed } = quietFeed()

  feed.offer(catalogPayload(CATALOG), at(100))

  for (let nth = 0; nth < MOST_WAITING_FRAMES; nth += 1) {
    feed.offer(eventPayload({ id: nth }), at(101 + nth))
  }

  assert.equal(feed.pending, MOST_WAITING_FRAMES)

  feed.advance(100 + MOST_WAITING_FRAMES + 1)

  assert.deepEqual(feed.catalog, CATALOG)
})

test('an older catalog that waits is let go before a newer one', () => {
  const { feed } = quietFeed()
  const older = { ...CATALOG, startup: '/40/0001/page1.bml' }

  feed.offer(catalogPayload(older), at(100))
  feed.offer(catalogPayload(CATALOG), at(101))

  for (let nth = 0; nth < MOST_WAITING_FRAMES - 1; nth += 1) {
    feed.offer(eventPayload({ id: nth }), at(102 + nth))
  }

  const heard: string[] = []

  feed.subscribe((change) =>
    heard.push(
      change.kind === 'catalog' ? change.catalog.startup : change.kind,
    ),
  )
  feed.advance(102 + MOST_WAITING_FRAMES)

  assert.deepEqual(heard, ['/40/0000/startup.bml'])
})

test('a reset lets go of what was waiting, bytes and all', () => {
  const { feed } = quietFeed()

  feed.offer(sizedModule(1, 1024), at(100))
  feed.reset()

  assert.equal(feed.pendingBytes, 0)
})

test('a module of an older version does not take the place of the version the catalog lists', () => {
  const { feed } = quietFeed()

  feed.offer(catalogPayload(CATALOG), at(1))
  feed.offer(modulePayload(moduleOf(0, 1)), at(2))
  feed.offer(modulePayload(moduleOf(0, 0)), at(3))
  feed.advance(3)

  assert.deepEqual(
    feed.heldModules.map((module) => module.version),
    [1],
  )
})

test('a runtime that opens is handed the modules the catalog lists, the one before kept while the listed version has not come', () => {
  const { feed } = quietFeed()
  const moved: BmlCatalog = {
    ...CATALOG,
    carousels: [
      {
        ...CATALOG.carousels[0],
        modules: [
          { ...CATALOG.carousels[0].modules[0], version: 2 },
          CATALOG.carousels[0].modules[1],
        ],
      },
    ],
  }

  feed.offer(catalogPayload(CATALOG), at(1))
  feed.offer(modulePayload(moduleOf(0, 1)), at(2))
  feed.offer(catalogPayload(moved), at(3))
  feed.offer(modulePayload(moduleOf(7)), at(4))
  feed.advance(4)

  assert.deepEqual(
    feed.forTheCatalog.map((module) => [module.id, module.version]),
    [[0, 1]],
  )

  feed.offer(modulePayload(moduleOf(0, 2)), at(5))
  feed.advance(5)

  assert.deepEqual(
    feed.forTheCatalog.map((module) => [module.id, module.version]),
    [[0, 2]],
  )
})

test('a replay that comes as the wire opens, its catalog newest and its modules older, can be opened at once', () => {
  const { feed } = quietFeed()

  feed.offer(catalogPayload(CATALOG), at(50))
  feed.offer(modulePayload(moduleOf(0)), at(20))
  feed.offer(modulePayload(moduleOf(1)), at(35))
  feed.advance(56)

  assert.equal(feed.availability, 'ready')
  assert.deepEqual(feed.forTheCatalog.map((module) => module.id).sort(), [0, 1])
})

test('a catalog and a module of the same time taken in either order both count', () => {
  for (const catalogFirst of [true, false]) {
    const { feed } = quietFeed()
    const catalog = catalogPayload(CATALOG)
    const startup = modulePayload(moduleOf(0))

    feed.offer(catalogFirst ? catalog : startup, at(10))
    feed.offer(catalogFirst ? startup : catalog, at(10))
    feed.advance(10)

    assert.equal(feed.availability, 'ready', `catalog first: ${catalogFirst}`)
  }
})
