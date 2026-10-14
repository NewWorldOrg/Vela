import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'

import { modulePayload, type BmlModule } from '@/lib/bml/resources'
import type { DataBroadcastChange } from '@/lib/data-broadcast-feed'
import {
  versionKey,
  type BroadcastVersion,
  type DataBroadcastTimeline,
  type PlacedVersion,
  type TimedEvent,
} from '@/lib/recording-data-broadcast'
import type { DataBroadcastRead } from '@/repository/video-data-broadcast'
import {
  MOST_READS_AT_ONCE,
  RESTS_AFTER_A_REFUSAL_MS,
  RESTS_WHILE_COMING_MS,
  RecordingDataBroadcast,
} from '@/components/recordings/recording-data-broadcast'

function settled(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

async function settledTwice(): Promise<void> {
  await settled()
  await settled()
}

function version(
  id: number,
  version: number,
  fromSec: number,
  toSec: number,
): BroadcastVersion {
  return { id, version, fromSec, toSec, size: 10 }
}

function event(atSec: number): TimedEvent {
  return {
    group: 1,
    id: atSec,
    type: 1,
    immediate: true,
    atSec,
    privateData: new Uint8Array(),
  }
}

/** When the recording began, part way into a second. */
const BEGAN = Date.parse('2026-01-01T00:00:00.250Z') / 1000

/** The start document changes version at 100; a second module is first seen at 50 and withdrawn at 400; a third is first seen at 300. */
const TIMELINE: DataBroadcastTimeline = {
  entryTag: 0x40,
  autoStart: false,
  startup: '/40/0000/startup.bml',
  incomplete: false,
  carousels: [
    {
      tag: 0x40,
      downloadId: 1,
      versions: [
        version(0, 1, 0, 99),
        version(0, 2, 100, 600),
        version(1, 1, 50, 400),
        version(2, 1, 300, 600),
      ],
    },
  ],
  events: [event(10), event(120), event(200)],
}

function moduleOf(placed: Pick<PlacedVersion, 'id' | 'version'>): BmlModule {
  return {
    tag: 0x40,
    id: placed.id,
    version: placed.version,
    resources: [
      {
        path: placed.id === 0 ? 'startup.bml' : `page${placed.id}.bml`,
        kind: 'bml',
        body: new TextEncoder().encode(`<bml>${placed.version}</bml>`),
      },
    ],
  }
}

interface Harness {
  broadcast: RecordingDataBroadcast
  changes: DataBroadcastChange[]
  askedVersions: string[]
  catalogAsked: number
  told: () => string[]
}

function harness(
  answer: () => DataBroadcastRead = () => ({
    state: 'read',
    timeline: TIMELINE,
  }),
  reading: (placed: PlacedVersion) => Uint8Array | null = (placed) =>
    modulePayload(moduleOf(placed)),
  began: number = BEGAN,
): Harness {
  const changes: DataBroadcastChange[] = []
  const askedVersions: string[] = []
  const made: Harness = {
    broadcast: new RecordingDataBroadcast(
      async () => {
        made.catalogAsked += 1

        return answer()
      },
      async (placed) => {
        askedVersions.push(versionKey(placed))

        return reading(placed)
      },
      1024,
      began,
      () => {},
    ),
    changes,
    askedVersions,
    catalogAsked: 0,
    told: () =>
      changes
        .filter((change) => change.kind !== 'clock')
        .map((change) => {
          switch (change.kind) {
            case 'module':
              return `module ${change.module.id}v${change.module.version}`
            case 'event':
              return `event ${change.event.id}`
            case 'catalog':
              return `catalog ${change.catalog.carousels[0].modules.map((module) => `${module.id}v${module.version}`).join(',')}`
            default:
              return change.kind
          }
        }),
  }

  made.broadcast.subscribe((change) => changes.push(change))

  return made
}

test('the catalog is read once, the versions in effect are read and handed on, and the broadcast is ready once the start document is in', async () => {
  const made = harness()
  const { broadcast, told, askedVersions } = made

  assert.equal(broadcast.availability, 'absent')
  broadcast.start()
  broadcast.advance(0)
  await settledTwice()

  assert.equal(made.catalogAsked, 1)
  assert.deepEqual(told().slice(0, 2), ['catalog 0v1', 'module 0v1'])
  assert.equal(broadcast.availability, 'ready')
  assert.equal(broadcast.catalog?.service, 1024)
  assert.deepEqual(
    broadcast.forTheCatalog.map((module) => module.version),
    [1],
  )
  assert.ok(askedVersions.includes('64/1/0/1'))
})

test('the versions of the next two minutes are read before they are needed, and no more are read at once than allowed', async () => {
  const { broadcast, askedVersions } = harness()

  broadcast.start()
  broadcast.advance(0)
  await settled()

  assert.deepEqual(askedVersions, ['64/1/0/1', '64/1/1/1', '64/1/0/2'])
  assert.ok(broadcast.asked.length <= MOST_READS_AT_ONCE)

  await settled()
  broadcast.advance(190)
  await settled()

  assert.deepEqual(askedVersions.at(-1), '64/1/2/1')
})

test('playing across a version change hands the new version from what was read ahead, and the catalog lists it', async () => {
  const { broadcast, told, askedVersions, changes } = harness()

  broadcast.start()
  broadcast.advance(0)
  await settledTwice()
  broadcast.advance(60)
  await settledTwice()
  changes.length = 0
  broadcast.advance(99.5)
  broadcast.advance(100)
  await settled()

  assert.deepEqual(told(), ['catalog 0v2,1v1', 'module 0v2'])
  assert.equal(askedVersions.filter((key) => key === '64/1/0/2').length, 1)
})

test('a new version of the start document that is not read yet leaves the one held, so the broadcast stays open', async () => {
  const { broadcast, changes } = harness(undefined, (placed) =>
    placed.version === 2 ? null : modulePayload(moduleOf(placed)),
  )

  broadcast.start()
  broadcast.advance(0)
  await settledTwice()
  changes.length = 0
  broadcast.advance(100)
  await settled()

  assert.equal(broadcast.availability, 'ready')
  assert.deepEqual(
    broadcast.forTheCatalog
      .filter((held) => held.id === 0)
      .map((held) => held.version),
    [1],
  )
})

test('an event message is handed once as playback passes its second, again after a seek back, and not at all when seeked over', async () => {
  const { broadcast, changes } = harness()
  const told = () =>
    changes
      .filter((change) => change.kind === 'event')
      .map((change) => (change.kind === 'event' ? change.event.id : 0))

  broadcast.start()
  broadcast.advance(9)
  await settledTwice()
  changes.length = 0

  for (const second of [9.5, 10, 10.5, 11]) {
    broadcast.advance(second)
  }

  assert.deepEqual(told(), [10])

  broadcast.advance(5)
  broadcast.advance(9.9)

  assert.deepEqual(told(), [10])

  broadcast.advance(10.1)

  assert.deepEqual(told(), [10, 10])

  broadcast.advance(250)
  broadcast.advance(250.5)

  assert.deepEqual(told(), [10, 10])
})

test('the time on air is when the recording began and the position played, told each time it moves, back after a seek, and not while paused', async () => {
  const { broadcast, changes } = harness()
  const told = () =>
    changes.flatMap((change) =>
      change.kind === 'clock' ? [change.seconds - BEGAN] : [],
    )

  assert.equal(broadcast.clock, null)

  broadcast.start()
  broadcast.advance(9)
  await settledTwice()

  assert.equal(broadcast.clock, BEGAN + 9)

  broadcast.advance(9.25)
  broadcast.advance(9.25)
  broadcast.advance(9.5)
  broadcast.advance(3)

  assert.deepEqual(told(), [9, 9.25, 9.5, 3])
  assert.equal(broadcast.clock, BEGAN + 3)

  broadcast.advance(120)
  broadcast.advance(120.25)

  assert.deepEqual(told(), [9, 9.25, 9.5, 3, 120, 120.25])
})

test('the time on air is told before the catalog, the modules and the event messages it brings, on a seek and as playback passes an event', async () => {
  const { broadcast, changes } = harness()
  const kinds = () => changes.map((change) => change.kind)

  broadcast.start()
  broadcast.advance(9)
  await settledTwice()
  changes.length = 0

  broadcast.advance(100.5)

  assert.deepEqual(kinds(), ['clock', 'catalog', 'module', 'module'])

  broadcast.advance(119)
  changes.length = 0
  broadcast.advance(119.5)
  broadcast.advance(120.25)

  assert.deepEqual(kinds(), ['clock', 'clock', 'event'])
})

test('the time on air of a recording whose start is not a time is not kept, and none is told', async () => {
  const { broadcast, changes } = harness(undefined, undefined, Number.NaN)

  broadcast.start()
  broadcast.advance(9)
  await settledTwice()
  broadcast.advance(10)

  assert.equal(broadcast.clock, null)
  assert.deepEqual(
    changes.filter((change) => change.kind === 'clock'),
    [],
  )
})

test('a seek back to before a module was first seen takes it out of the catalog, and forward past its last second too', async () => {
  const { broadcast } = harness()

  broadcast.start()
  broadcast.advance(60)
  await settledTwice()

  assert.deepEqual(
    broadcast.catalog?.carousels[0].modules.map((module) => module.id),
    [0, 1],
  )

  broadcast.advance(10)

  assert.deepEqual(
    broadcast.catalog?.carousels[0].modules.map((module) => module.id),
    [0],
  )
  assert.deepEqual(
    broadcast.forTheCatalog.map((module) => module.id),
    [0],
  )

  broadcast.advance(450)
  await settledTwice()

  assert.deepEqual(
    broadcast.catalog?.carousels[0].modules.map((module) => module.id),
    [0, 2],
  )
})

test('a version read is let go once it is behind, and read again when seeked back to', async () => {
  const { broadcast, askedVersions } = harness()

  broadcast.start()
  broadcast.advance(0)
  await settledTwice()
  broadcast.advance(300)
  await settledTwice()
  broadcast.advance(0)
  await settledTwice()

  assert.equal(askedVersions.filter((key) => key === '64/1/0/1').length, 2)
})

test('an incomplete catalog opens where the start document is: absent before it is first seen, ready after', async () => {
  const late: DataBroadcastTimeline = {
    ...TIMELINE,
    incomplete: true,
    carousels: [
      {
        tag: 0x40,
        downloadId: 1,
        versions: [version(0, 1, 30, 600), version(1, 1, 0, 600)],
      },
    ],
  }
  const { broadcast } = harness(() => ({ state: 'read', timeline: late }))

  broadcast.start()
  broadcast.advance(0)
  await settledTwice()

  assert.equal(broadcast.availability, 'absent')
  assert.equal(broadcast.incomplete, true)

  broadcast.advance(30)
  await settledTwice()

  assert.equal(broadcast.availability, 'ready')
})

test('a version the recording cannot answer is left out, and the broadcast stays absent without its start document', async () => {
  const { broadcast, told } = harness(undefined, () => null)

  broadcast.start()
  broadcast.advance(0)
  await settledTwice()

  assert.equal(broadcast.availability, 'absent')
  assert.deepEqual(told(), ['catalog 0v1'])
})

test('a recording with no data broadcast says none, once', async () => {
  const { broadcast, told } = harness(() => ({ state: 'none' }))

  broadcast.start()
  broadcast.advance(0)
  await settledTwice()

  assert.equal(broadcast.availability, 'none')
  assert.deepEqual(told(), ['none'])
})

test('a catalog still being made is asked for again after a rest, and one that could not be read sooner', async (t: TestContext) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })

  const answers: DataBroadcastRead[] = [
    { state: 'coming' },
    { state: 'failed' },
    { state: 'read', timeline: TIMELINE },
  ]
  const made = harness(() => answers.shift() ?? { state: 'none' })

  made.broadcast.start()
  made.broadcast.advance(0)
  await settledTwice()

  assert.equal(made.catalogAsked, 1)

  t.mock.timers.tick(RESTS_WHILE_COMING_MS - 1)
  await settledTwice()

  assert.equal(made.catalogAsked, 1)

  t.mock.timers.tick(1)
  await settledTwice()

  assert.equal(made.catalogAsked, 2)

  t.mock.timers.tick(RESTS_AFTER_A_REFUSAL_MS)
  await settledTwice()
  await settledTwice()

  assert.equal(made.catalogAsked, 3)
  assert.equal(made.broadcast.availability, 'ready')
})

test('closing stops what is being read and asks for nothing more', async () => {
  const { broadcast, askedVersions } = harness()

  broadcast.start()
  broadcast.advance(0)
  await settled()
  broadcast.close()
  await settledTwice()

  const asked = askedVersions.length

  broadcast.advance(300)
  await settledTwice()

  assert.equal(askedVersions.length, asked)
})
