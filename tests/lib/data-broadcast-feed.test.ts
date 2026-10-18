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
  tag,
}: {
  group?: number
  id?: number
  type?: number
  timeKind?: number
  fires?: number
  data?: number[]
  tag?: number
} = {}): Uint8Array {
  const payload = new Uint8Array(17 + data.length + (tag === undefined ? 0 : 1))
  const view = new DataView(payload.buffer)

  payload[0] = 0x03
  view.setUint16(1, group)
  view.setUint16(3, id)
  payload[5] = type
  payload[6] = timeKind
  view.setUint32(7, Math.floor(fires / 2 ** 32))
  view.setUint32(11, fires % 2 ** 32)
  view.setUint16(15, data.length)
  payload.set(data, 17)
  if (tag !== undefined) {
    payload[17 + data.length] = tag
  }

  return payload
}

function nptPayload({
  tag = 0x40,
  stc = at(10),
  npt = at(100),
  numerator = 1,
  denominator = 1,
}: {
  tag?: number
  stc?: number
  npt?: number
  numerator?: number
  denominator?: number
} = {}): Uint8Array {
  const payload = new Uint8Array(22)
  const view = new DataView(payload.buffer)

  payload[0] = 0x05
  payload[1] = tag
  view.setUint32(2, Math.floor(stc / 2 ** 32))
  view.setUint32(6, stc % 2 ** 32)
  view.setUint32(10, Math.floor(npt / 2 ** 32))
  view.setUint32(14, npt % 2 ** 32)
  view.setUint16(18, numerator)
  view.setUint16(20, denominator)

  return payload
}

function sizedModule(id: number, bytes: number, version = 1): Uint8Array {
  const payload = new Uint8Array(bytes)
  const view = new DataView(payload.buffer)
  const path = new TextEncoder().encode('big.bin')

  payload[0] = 0x02
  payload[1] = 0x40
  view.setUint16(2, id)
  payload[4] = version
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
  assert.deepEqual(readDataBroadcast(Uint8Array.of(0x06)), { said: 'unknown' })
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

test('an event message closed by one more byte is read with that byte as the component tag of its stream, and one without it names none', () => {
  const tagged = readDataBroadcast(eventPayload({ data: [0x01], tag: 0x5e }))
  const untagged = readDataBroadcast(eventPayload({ data: [0x01] }))

  assert.ok(tagged.said === 'event')
  assert.equal(tagged.event.componentTag, 0x5e)
  assert.deepEqual([...tagged.event.privateData], [0x01])
  assert.ok(untagged.said === 'event')
  assert.equal('componentTag' in untagged.event, false)

  const tooLong = new Uint8Array(eventPayload({ data: [0x01] }).length + 2)

  tooLong.set(eventPayload({ data: [0x01] }))
  assert.deepEqual(readDataBroadcast(tooLong), { said: 'unknown' })
})

test('the same event message on two streams is held as two', () => {
  const { feed } = quietFeed()

  feed.offer(eventPayload({ id: 1, tag: 0x40 }), at(1))
  feed.offer(eventPayload({ id: 1, tag: 0x5e }), at(1))
  feed.offer(eventPayload({ id: 1, tag: 0x5e }), at(1))
  feed.advance(1)

  assert.deepEqual(
    feed.events.map((event) => event.componentTag),
    [0x40, 0x5e],
  )
})

test('an event message with a length that does not match, or an unknown time kind, is not read', () => {
  const short = eventPayload().subarray(0, 18)

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

  feed.offer(sizedModule(4, quarter - 64, 2), at(3))
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
  assert.equal(heard.length, 1)
  assert.equal(feed.availability, 'absent')

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

  feed.subscribe((change) => {
    if (change.kind === 'catalog') {
      heard.push(change.catalog.startup)
    }
  })
  feed.advance(102 + MOST_WAITING_FRAMES)

  assert.deepEqual(heard, ['/40/0000/startup.bml'])
  assert.equal(feed.events.length, MOST_HELD_EVENTS)
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

test('a replay that comes twice, as when a wire is laid again, is passed on once', () => {
  const { feed } = quietFeed()
  const heard: string[] = []

  feed.subscribe((change) =>
    heard.push(
      change.kind === 'module'
        ? `module ${change.module.id} v${change.module.version}`
        : change.kind,
    ),
  )

  for (const time of [10, 20]) {
    feed.offer(catalogPayload(CATALOG), at(time))
    feed.offer(modulePayload(moduleOf(0)), at(time - 5))
    feed.offer(modulePayload(moduleOf(1)), at(time - 3))
    feed.advance(time)
  }

  assert.deepEqual(heard, ['module 0 v1', 'module 1 v1', 'catalog'])
  assert.equal(feed.availability, 'ready')
})

test('a catalog that changes is taken even when it comes beside a replay of the old one', () => {
  const { feed } = quietFeed()
  const moved: BmlCatalog = {
    ...CATALOG,
    startup: '/40/0001/page1.bml',
  }

  feed.offer(catalogPayload(CATALOG), at(1))
  feed.offer(catalogPayload(moved), at(2))
  feed.offer(catalogPayload(moved), at(3))
  feed.advance(3)

  assert.equal(feed.catalog?.startup, '/40/0001/page1.bml')
})

test('a wire opened again after a reset brings the broadcast back from its replay alone', () => {
  const { feed } = quietFeed()
  const replay = () => {
    feed.offer(catalogPayload(CATALOG), at(30))
    feed.offer(modulePayload(moduleOf(0)), at(12))
  }

  replay()
  feed.advance(31)
  feed.reset()

  assert.equal(feed.availability, 'absent')

  replay()
  feed.advance(31)

  assert.equal(feed.availability, 'ready')
})

test('an immediate event message is passed on at the time of its frame, with its private data copied out of the frame', () => {
  const { feed } = quietFeed()
  const heard: DataBroadcastChange[] = []
  const frame = new Uint8Array(4 + 19)

  frame.set(eventPayload({ fires: at(3), data: [0x41, 0x42] }), 4)
  feed.subscribe((change) => heard.push(change))
  feed.offer(frame.subarray(4), at(3))
  feed.advance(2.99)

  assert.equal(heard.length, 0)

  feed.advance(3)

  assert.equal(heard.length, 1)
  assert.equal(heard[0].kind, 'event')

  if (heard[0].kind === 'event') {
    assert.equal(heard[0].event.immediate, true)
    assert.equal(heard[0].event.privateData.byteOffset, 0)
    assert.equal(heard[0].event.privateData.buffer.byteLength, 2)
    assert.deepEqual([...heard[0].event.privateData], [0x41, 0x42])
  }
})

test('an event message that fires at a moment of the programme is passed on when the playhead reaches that moment, once', () => {
  const { feed } = quietFeed()
  const heard: DataBroadcastChange[] = []

  feed.subscribe((change) => heard.push(change))
  feed.offer(eventPayload({ timeKind: 2, fires: at(12) }), at(2))
  feed.offer(catalogPayload(CATALOG), at(4))
  feed.advance(2)

  assert.equal(heard.length, 0)

  feed.advance(4)

  assert.deepEqual(
    heard.map((change) => change.kind),
    ['catalog'],
  )

  feed.advance(11.9)

  assert.equal(heard.length, 1)

  feed.advance(12)

  assert.deepEqual(
    heard.map((change) => change.kind),
    ['catalog', 'event'],
  )

  feed.offer(eventPayload({ timeKind: 2, fires: at(12) }), at(13))
  feed.advance(13)

  assert.equal(heard.length, 2)
  assert.equal(feed.events.length, 1)
})

test('an event message whose moment has already passed when it comes is passed on at the time of its frame', () => {
  const { feed } = quietFeed()
  const heard: DataBroadcastChange[] = []

  feed.subscribe((change) => heard.push(change))
  feed.offer(eventPayload({ timeKind: 2, fires: at(5) }), at(8))
  feed.advance(7)

  assert.equal(heard.length, 0)

  feed.advance(8)

  assert.equal(heard.length, 1)
})

test('a catalog whose versions moved on passes on only the modules that changed, not those sent again at the version held', () => {
  const { feed } = quietFeed()
  const heard: DataBroadcastChange[] = []
  const moved: BmlCatalog = {
    ...CATALOG,
    carousels: [
      {
        ...CATALOG.carousels[0],
        modules: [
          { id: 0, version: 1, size: 40, resources: [] },
          { id: 1, version: 2, size: 30, resources: [] },
        ],
      },
    ],
  }

  feed.offer(catalogPayload(CATALOG), at(1))
  feed.offer(modulePayload(moduleOf(0)), at(1))
  feed.offer(modulePayload(moduleOf(1)), at(1))
  feed.advance(1)
  feed.subscribe((change) => heard.push(change))
  feed.offer(catalogPayload(moved), at(2))
  feed.offer(modulePayload(moduleOf(0)), at(3))
  feed.offer(modulePayload(moduleOf(1, 2, '<bml>2</bml>')), at(3))
  feed.offer(modulePayload(moduleOf(0)), at(4))
  feed.advance(4)

  assert.deepEqual(
    heard.map((change) =>
      change.kind === 'module'
        ? `${change.kind} ${change.module.id} v${change.module.version}`
        : change.kind,
    ),
    ['catalog', 'module 1 v2'],
  )
  assert.equal(feed.availability, 'ready')
})

test('an NPT reference is read with its stream, the moment it names, the NPT then and its scale', () => {
  assert.deepEqual(
    readDataBroadcast(
      nptPayload({
        tag: 0x72,
        stc: 2 ** 33 + 5,
        npt: 2 ** 33 - 1,
        numerator: 3,
        denominator: 2,
      }),
    ),
    {
      said: 'npt',
      reference: {
        tag: 0x72,
        stc: 2 ** 33 + 5,
        npt: 2 ** 33 - 1,
        numerator: 3,
        denominator: 2,
      },
    },
  )
})

test('an NPT reference of the wrong length, a zero scale or an NPT past thirty-three bits is not read', () => {
  const long = new Uint8Array(23)

  long.set(nptPayload())

  for (const payload of [
    nptPayload().slice(0, 21),
    long,
    nptPayload({ numerator: 0 }),
    nptPayload({ denominator: 0 }),
    nptPayload({ npt: 2 ** 33 }),
  ]) {
    assert.deepEqual(readDataBroadcast(payload), { said: 'unknown' })
  }
})

test('an NPT reference takes effect when the playhead reaches the moment it names, and is passed on read at the playhead in milliseconds', () => {
  const { feed } = quietFeed()
  const heard: DataBroadcastChange[] = []

  feed.subscribe((change) => heard.push(change))
  feed.offer(nptPayload({ stc: at(10), npt: at(100) }), at(4))
  feed.advance(9.9)

  assert.equal(heard.length, 0)
  assert.deepEqual(feed.nptReadings, [])

  feed.advance(10.5)

  assert.deepEqual(heard, [
    { kind: 'npt', reading: { tag: 0x40, milliseconds: 100_500, rate: 1 } },
  ])

  feed.advance(12)

  assert.deepEqual(feed.nptReadings, [
    { tag: 0x40, milliseconds: 102_000, rate: 1 },
  ])
})

test('an NPT reference sent again is passed on once, one that moves is passed on again, and each stream keeps its own', () => {
  const { feed } = quietFeed()
  const heard: DataBroadcastChange[] = []

  feed.subscribe((change) => heard.push(change))
  feed.offer(nptPayload({ stc: at(1), npt: 0 }), at(1))
  feed.offer(nptPayload({ stc: at(1), npt: 0 }), at(2))
  feed.offer(
    nptPayload({
      tag: 0x72,
      stc: at(2),
      npt: at(50),
      numerator: 1,
      denominator: 2,
    }),
    at(2),
  )
  feed.offer(nptPayload({ stc: at(3), npt: at(30) }), at(3))
  feed.advance(4)

  assert.deepEqual(
    heard.map((change) => (change.kind === 'npt' ? change.reading.tag : null)),
    [0x40, 0x72, 0x40],
  )
  assert.deepEqual(feed.nptReadings, [
    { tag: 0x40, milliseconds: 31_000, rate: 1 },
    { tag: 0x72, milliseconds: 51_000, rate: 0.5 },
  ])
})

test('live, the feed keeps no time on air and tells none as the playhead moves, so the runtime reads the wall clock', () => {
  const { feed } = quietFeed()
  const heard: DataBroadcastChange[] = []

  feed.subscribe((change) => heard.push(change))
  feed.offer(catalogPayload(CATALOG), at(1))
  feed.advance(5)
  feed.advance(9)

  assert.equal(feed.clock, null)
  assert.deepEqual(
    heard.filter((change) => change.kind === 'clock'),
    [],
  )
})

test('none and a reset forget the NPT references', () => {
  const { feed } = quietFeed()

  feed.offer(nptPayload({ stc: at(1) }), at(1))
  feed.advance(1)
  feed.offer(NONE, at(2))
  feed.advance(2)

  assert.deepEqual(feed.nptReadings, [])

  feed.offer(nptPayload({ stc: at(3) }), at(3))
  feed.advance(3)
  feed.reset()

  assert.deepEqual(feed.nptReadings, [])
})

test('an event message that fires at a moment of the programme and the NPT reference that names it reach the listener in the order of their moments', () => {
  const { feed } = quietFeed()
  const heard: DataBroadcastChange[] = []

  feed.subscribe((change) => heard.push(change))
  feed.offer(nptPayload({ stc: at(6), npt: 0 }), at(5))
  feed.offer(eventPayload({ timeKind: 2, fires: at(8) }), at(5))
  feed.advance(7)

  assert.deepEqual(
    heard.map((change) => change.kind),
    ['npt'],
  )

  feed.advance(8)

  assert.deepEqual(
    heard.map((change) => change.kind),
    ['npt', 'event'],
  )
})
