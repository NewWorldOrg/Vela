import assert from 'node:assert/strict'
import { test } from 'node:test'

import { PTS_HERTZ } from '@/lib/live-wire'
import {
  MOST_STEP_SEC,
  READS_AHEAD_WITHIN_SEC,
  broadcastEventOf,
  catalogAt,
  eventsBetween,
  isASeek,
  timelineOf,
  versionKey,
  versionsAhead,
  versionsAt,
  type BroadcastVersion,
  type DataBroadcastTimeline,
  type TimedEvent,
} from '@/lib/recording-data-broadcast'

function version(
  id: number,
  version: number,
  fromSec: number,
  toSec: number,
): BroadcastVersion {
  return { id, version, fromSec, toSec, size: 10 * version }
}

function event(atSec: number, id = atSec, immediate = true): TimedEvent {
  return {
    group: 1,
    id,
    type: 1,
    immediate,
    atSec,
    privateData: new Uint8Array(),
  }
}

/** Module 0 changes version at 101 with a second between the two. Module 1 is last seen at 40 and seen again at 150 as a new version. Module 2 is withdrawn at 80. Module 3 has two versions that overlap. The second carousel holds one module throughout. */
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
        version(0, 1, 0, 100),
        version(0, 2, 101, 300),
        version(1, 1, 0, 40),
        version(1, 2, 150, 300),
        version(2, 1, 50, 80),
        version(3, 1, 0, 200),
        version(3, 2, 100, 300),
      ],
    },
    { tag: 0x60, downloadId: 2, versions: [version(0, 3, 0, 300)] },
  ],
  events: [event(10), event(120), event(200)],
}

function chosen(second: number): string[] {
  return versionsAt(TIMELINE, second).map(versionKey).sort()
}

test('at a second, each module stands at the latest version first seen by then', () => {
  assert.deepEqual(chosen(0), ['64/1/0/1', '64/1/1/1', '64/1/3/1', '96/2/0/3'])
  assert.deepEqual(chosen(101), [
    '64/1/0/2',
    '64/1/1/1',
    '64/1/3/2',
    '96/2/0/3',
  ])
})

test('a version stands on past its last second until the next version of its module is first seen', () => {
  assert.deepEqual(chosen(100.5), [
    '64/1/0/1',
    '64/1/1/1',
    '64/1/3/2',
    '96/2/0/3',
  ])
  assert.ok(chosen(149).includes('64/1/1/1'))
  assert.ok(chosen(150).includes('64/1/1/2'))
})

test('a module withdrawn for good is gone after its last second, and absent before it is first seen', () => {
  assert.ok(chosen(60).includes('64/1/2/1'))
  assert.equal(chosen(80.5).includes('64/1/2/1'), false)
  assert.equal(chosen(49).includes('64/1/2/1'), false)
})

test('where two versions overlap, the one first seen later stands', () => {
  assert.ok(chosen(50).includes('64/1/3/1'))
  assert.ok(chosen(150).includes('64/1/3/2'))
  assert.equal(chosen(150).includes('64/1/3/1'), false)
})

test('the versions coming within two minutes are named in the order they are first seen', () => {
  assert.deepEqual(versionsAhead(TIMELINE, 0).map(versionKey), [
    '64/1/2/1',
    '64/1/3/2',
    '64/1/0/2',
  ])
  assert.deepEqual(versionsAhead(TIMELINE, 40).map(versionKey), [
    '64/1/2/1',
    '64/1/3/2',
    '64/1/0/2',
    '64/1/1/2',
  ])
  assert.equal(READS_AHEAD_WITHIN_SEC, 120)
  assert.deepEqual(versionsAhead(TIMELINE, 200), [])
})

test('the catalog for a second lists each carousel with the versions in effect, no resources, and the service given', () => {
  const catalog = catalogAt(TIMELINE, 101, 1024)

  assert.equal(catalog.service, 1024)
  assert.equal(catalog.entryTag, 0x40)
  assert.equal(catalog.startup, '/40/0000/startup.bml')
  assert.deepEqual(catalog.carousels, [
    {
      tag: 0x40,
      downloadId: 1,
      modules: [
        { id: 0, version: 2, size: 20, resources: [] },
        { id: 1, version: 1, size: 10, resources: [] },
        { id: 3, version: 2, size: 20, resources: [] },
      ],
    },
    {
      tag: 0x60,
      downloadId: 2,
      modules: [{ id: 0, version: 3, size: 30, resources: [] }],
    },
  ])
})

test('a carousel with nothing in effect is still listed, empty', () => {
  const emptied: DataBroadcastTimeline = {
    ...TIMELINE,
    carousels: [
      TIMELINE.carousels[0],
      { tag: 0x60, downloadId: 2, versions: [version(0, 3, 200, 300)] },
    ],
  }

  assert.deepEqual(catalogAt(emptied, 0, 1).carousels[1], {
    tag: 0x60,
    downloadId: 2,
    modules: [],
  })
})

test('the events after one second and up to another come in order, each once', () => {
  assert.deepEqual(
    eventsBetween(TIMELINE, 0, 10).map((one) => one.atSec),
    [10],
  )
  assert.deepEqual(
    eventsBetween(TIMELINE, 10, 200).map((one) => one.atSec),
    [120, 200],
  )
  assert.deepEqual(eventsBetween(TIMELINE, 200, 300), [])
})

test('an event is handed to the runtime at its second on the 90 kHz clock', () => {
  const handed = broadcastEventOf(event(12.5, 7, false))

  assert.equal(handed.at, 12.5 * PTS_HERTZ)
  assert.equal(handed.id, 7)
  assert.equal(handed.immediate, false)
})

test('a first reading, a move back, or a move forward further than playing carries it is a seek', () => {
  assert.equal(isASeek(null, 0), true)
  assert.equal(isASeek(10, 9), true)
  assert.equal(isASeek(10, 10 + MOST_STEP_SEC + 0.1), true)
  assert.equal(isASeek(10, 10 + MOST_STEP_SEC), false)
  assert.equal(isASeek(10, 10.25), false)
})

const ANSWERED = {
  entryTag: 64,
  autoStart: true,
  startup: '/40/0000/startup.bml',
  incomplete: true,
  carousels: [
    {
      tag: 64,
      downloadId: 268435455,
      versions: [
        { id: 50, version: 7, fromSec: 0.0936776, toSec: 2745.18, size: 29 },
      ],
    },
    { tag: 114, downloadId: 4026531839, versions: [] },
  ],
  events: [
    {
      group: 1,
      id: 37377,
      type: 1,
      immediate: true,
      atSec: 0.44,
      privateData: '',
    },
    {
      group: 1,
      id: 37633,
      type: 1,
      immediate: false,
      atSec: 0.09,
      privateData: btoa('ab'),
    },
  ],
}

test('the catalog answered is read into a timeline, its events in the order they fire and their private data as bytes', () => {
  const timeline = timelineOf(ANSWERED)

  assert.ok(timeline)
  assert.equal(timeline.incomplete, true)
  assert.equal(timeline.autoStart, true)
  assert.equal(timeline.carousels[1].downloadId, 4026531839)
  assert.deepEqual(
    timeline.events.map((one) => one.id),
    [37633, 37377],
  )
  assert.deepEqual([...timeline.events[0].privateData], [97, 98])
})

test('an answer whose shape is not a catalog is not read', () => {
  assert.equal(timelineOf(null), null)
  assert.equal(timelineOf({ ...ANSWERED, startup: 7 }), null)
  assert.equal(
    timelineOf({
      ...ANSWERED,
      carousels: [
        {
          tag: 64,
          downloadId: 1,
          versions: [{ id: 0, version: 1, fromSec: 10, toSec: 9, size: 1 }],
        },
      ],
    }),
    null,
  )
  assert.equal(
    timelineOf({
      ...ANSWERED,
      events: [{ ...ANSWERED.events[0], atSec: -1 }],
    }),
    null,
  )
  assert.equal(
    timelineOf({
      ...ANSWERED,
      events: [{ ...ANSWERED.events[0], privateData: '%%' }],
    }),
    null,
  )
})
