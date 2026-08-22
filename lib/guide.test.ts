import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { GuideRelationKind } from './guide.ts'
import {
  broadcastDateOf,
  gridMinWidthOf,
  nowMinOf,
  openingScrollTopOf,
  sharesWith,
  splitServicesSettled,
  unscheduledSpansOf,
  windowStartOf,
} from './guide.ts'

/** The height the grid gives an hour, which the guide's own metrics set. */
const HOUR_PX = 96

/**
 * One in the morning on the 21st: past midnight, and so still inside the
 * broadcast day the 20th named. Written as the instant it is, because that is
 * all the API ever hands over.
 */
const AFTER_MIDNIGHT = new Date('2026-08-20T16:00:00Z')

test('an hour past midnight still belongs to the day before', () => {
  assert.equal(broadcastDateOf(AFTER_MIDNIGHT), '2026-08-20')
})

test('the last minute before four still belongs to the day before', () => {
  assert.equal(broadcastDateOf(new Date('2026-08-20T18:59:59Z')), '2026-08-20')
})

test('four in the morning is where the next day starts', () => {
  assert.equal(broadcastDateOf(new Date('2026-08-20T19:00:00Z')), '2026-08-21')
})

test('a broadcast day opens at four in the morning, Japan time', () => {
  assert.equal(
    windowStartOf('2026-08-20').toISOString(),
    '2026-08-19T19:00:00.000Z',
  )
})

test('an hour past midnight sits twenty-one hours into its broadcast day', () => {
  assert.equal(
    nowMinOf(AFTER_MIDNIGHT, windowStartOf(broadcastDateOf(AFTER_MIDNIGHT))),
    21 * 60,
  )
})

test('a window that does not hold now is given no now at all', () => {
  assert.equal(nowMinOf(AFTER_MIDNIGHT, windowStartOf('2026-08-21')), undefined)
  assert.equal(nowMinOf(AFTER_MIDNIGHT, windowStartOf('2026-08-19')), undefined)
})

test('the guide opens half an hour above the line', () => {
  assert.equal(openingScrollTopOf(600, HOUR_PX), (570 / 60) * HOUR_PX)
})

test('it opens half an hour above the line an hour past midnight too', () => {
  const nowMin = nowMinOf(
    AFTER_MIDNIGHT,
    windowStartOf(broadcastDateOf(AFTER_MIDNIGHT)),
  )

  assert.equal(nowMin, 1260)
  assert.equal(
    openingScrollTopOf(nowMin, HOUR_PX),
    ((nowMin as number) / 60) * HOUR_PX - HOUR_PX / 2,
  )
})

test('a day the present is not in opens at the top', () => {
  assert.equal(openingScrollTopOf(undefined, HOUR_PX), 0)
})

test('the first half hour of a day opens at the top, not above it', () => {
  assert.equal(openingScrollTopOf(0, HOUR_PX), 0)
  assert.equal(openingScrollTopOf(29, HOUR_PX), 0)
})

test('a minute past the lead opens a minute in', () => {
  assert.equal(openingScrollTopOf(31, HOUR_PX), HOUR_PX / 60)
})

/**
 * What one aerial really hands over: 27 television services, once the
 * one-segment, temporary and data services that never take a column are left
 * out. The number is here because it is the case the width rule exists for.
 */
const TELEVISION_SERVICES = 27

test('a channel is given a column a programme name fits in', () => {
  assert.equal(gridMinWidthOf(1), 46 + 200)
  assert.equal(gridMinWidthOf(4), 46 + 4 * 200)
})

test('a whole aerial is wider than the screen it is read on', () => {
  const width = gridMinWidthOf(TELEVISION_SERVICES)

  assert.equal(width, 46 + TELEVISION_SERVICES * 200)
  assert.ok(width > 1400)
})

test('a grid with no channels is the hour gutter and nothing else', () => {
  assert.equal(gridMinWidthOf(0), 46)
})

/**
 * One network: the service the rest of it split from, which is its lowest
 * number, and the two columns that service splits into above it.
 */
const WHOLE = { networkId: 41000, serviceId: 5100 }
const SPLIT = { networkId: 41000, serviceId: 5101 }
const SPLIT_AGAIN = { networkId: 41000, serviceId: 5102 }

/** A second network, whose services are nothing to do with the first's. */
const ELSEWHERE = { networkId: 41001, serviceId: 6200 }

const broadcast = (
  ...related: {
    kind: GuideRelationKind
    networkId: number
    serviceId: number
  }[]
) => ({ related })

test('a broadcast the service it split from is also carrying is shared', () => {
  assert.equal(sharesWith(broadcast({ kind: 'shared', ...WHOLE }), WHOLE), true)
})

test('a broadcast of its own is not shared, however it is named', () => {
  assert.equal(sharesWith(broadcast(), WHOLE), false)
})

/**
 * A relay and a move name another service too, and mean the opposite of a
 * share: the same programme at another hour or on another channel, not this
 * hour on both.
 */
test('a relayed or moved broadcast is not shared', () => {
  assert.equal(
    sharesWith(broadcast({ kind: 'relayed', ...WHOLE }), WHOLE),
    false,
  )
  assert.equal(sharesWith(broadcast({ kind: 'moved', ...WHOLE }), WHOLE), false)
})

test('a share with some other service is not a share with this one', () => {
  assert.equal(
    sharesWith(broadcast({ kind: 'shared', ...SPLIT }), WHOLE),
    false,
  )
  assert.equal(
    sharesWith(
      broadcast({
        kind: 'shared',
        networkId: ELSEWHERE.networkId,
        serviceId: WHOLE.serviceId,
      }),
      WHOLE,
    ),
    false,
  )
})

test('one share among several is a share', () => {
  assert.equal(
    sharesWith(
      broadcast(
        { kind: 'relayed', ...ELSEWHERE },
        { kind: 'shared', ...WHOLE },
      ),
      WHOLE,
    ),
    true,
  )
})

const carrying = (
  service: { networkId: number; serviceId: number },
  name: string,
  ...related: {
    kind: GuideRelationKind
    networkId: number
    serviceId: number
  }[]
) => ({ ...service, name, related })

test('the service of a network takes a column and keeps all of it', () => {
  const own = carrying(WHOLE, 'the evening news')
  const settled = splitServicesSettled([WHOLE], [own])

  assert.deepEqual(settled.services, [{ service: WHOLE, sub: false }])
  assert.deepEqual(settled.broadcasts, [own])
})

test('a service that has split keeps only what it does not share', () => {
  const shared = carrying(SPLIT, 'the evening news', {
    kind: 'shared',
    ...WHOLE,
  })
  const own = carrying(SPLIT, 'the second half')
  const settled = splitServicesSettled([WHOLE, SPLIT], [shared, own])

  assert.deepEqual(settled.services, [
    { service: WHOLE, sub: false },
    { service: SPLIT, sub: true },
  ])
  assert.deepEqual(settled.broadcasts, [own])
})

/**
 * The named case, which is the one a reading by name gets wrong: the
 * broadcaster does send a name for some shared hours, and it is the whole
 * service's own name. Read by name the column repeats what is beside it; read
 * by the share it says nothing, which is what it is doing.
 */
test('a shared broadcast is dropped however it is named', () => {
  const settled = splitServicesSettled(
    [WHOLE, SPLIT],
    [
      carrying(WHOLE, 'the shopping hour'),
      carrying(SPLIT, 'the shopping hour', {
        kind: 'shared',
        ...WHOLE,
      }),
    ],
  )

  assert.deepEqual(settled.services, [{ service: WHOLE, sub: false }])
  assert.deepEqual(
    settled.broadcasts.map((carried) => carried.serviceId),
    [WHOLE.serviceId],
  )
})

test('a service sharing every hour of the day takes no column at all', () => {
  const settled = splitServicesSettled(
    [WHOLE, SPLIT],
    [
      carrying(WHOLE, 'the evening news'),
      carrying(SPLIT, '', { kind: 'shared', ...WHOLE }),
    ],
  )

  assert.deepEqual(settled.services, [{ service: WHOLE, sub: false }])
  assert.equal(settled.broadcasts.length, 1)
})

test('a service with nothing listed at all takes no column either', () => {
  const settled = splitServicesSettled(
    [WHOLE, SPLIT],
    [carrying(WHOLE, 'the evening news')],
  )

  assert.deepEqual(settled.services, [{ service: WHOLE, sub: false }])
})

/**
 * The order the columns arrive in is how they are drawn and nothing more. They
 * are sorted for reading, by a remote control key a service does not always
 * send, and a key that has not arrived yet can put a split ahead of the
 * service it split from.
 *
 * Read as the whole service, that split would take the real one for a split of
 * its own — and since the whole service names it under a share on every hour
 * it hands over, every one of those hours would be dropped and the column that
 * carries the network's whole schedule would leave the guide. So the service
 * is the lowest numbered either way, and the order only says where to draw it.
 */
test('the whole service is the lowest numbered, in whatever order it arrives', () => {
  const all = carrying(WHOLE, 'the evening news', { kind: 'shared', ...SPLIT })
  const shared = carrying(SPLIT, 'the evening news', {
    kind: 'shared',
    ...WHOLE,
  })
  const own = carrying(SPLIT, 'the second half')
  const settled = splitServicesSettled([SPLIT, WHOLE], [all, shared, own])

  assert.deepEqual(settled.services, [
    { service: SPLIT, sub: true },
    { service: WHOLE, sub: false },
  ])
  assert.deepEqual(settled.broadcasts, [own, all])
})

/**
 * A third column is settled against the service the rest of the network split
 * from, not against the second: what the second is showing is its own
 * business, and two splits showing the same thing are two things neither of
 * them shares with the whole service.
 */
test('a third service is settled against the whole, not the second', () => {
  const one = carrying(SPLIT, 'the second half')
  const two = carrying(SPLIT_AGAIN, 'the second half')
  const settled = splitServicesSettled(
    [WHOLE, SPLIT, SPLIT_AGAIN],
    [carrying(WHOLE, 'the evening news'), one, two],
  )

  assert.deepEqual(
    settled.services.map(({ service, sub }) => [service.serviceId, sub]),
    [
      [WHOLE.serviceId, false],
      [SPLIT.serviceId, true],
      [SPLIT_AGAIN.serviceId, true],
    ],
  )
  assert.equal(settled.broadcasts.length, 3)
})

test('each network is settled on its own', () => {
  const settled = splitServicesSettled(
    [WHOLE, SPLIT, ELSEWHERE],
    [
      carrying(WHOLE, 'the evening news'),
      carrying(SPLIT, '', { kind: 'shared', ...WHOLE }),
      carrying(ELSEWHERE, 'the late film'),
    ],
  )

  assert.deepEqual(
    settled.services.map(({ service }) => service.serviceId),
    [WHOLE.serviceId, ELSEWHERE.serviceId],
  )
})

/** An eight hour window, in minutes, which the fixtures are written on. */
const EVENING_MIN = 8 * 60

test('a column carrying nothing is unscheduled the whole window', () => {
  assert.deepEqual(unscheduledSpansOf([], EVENING_MIN), [
    { startMin: 0, durationMin: EVENING_MIN },
  ])
})

test('a column carrying programmes end to end has no unscheduled run', () => {
  assert.deepEqual(
    unscheduledSpansOf(
      [
        { startMin: 0, durationMin: 120 },
        { startMin: 120, durationMin: EVENING_MIN - 120 },
      ],
      EVENING_MIN,
    ),
    [],
  )
})

test('the hours between two programmes are unscheduled', () => {
  assert.deepEqual(
    unscheduledSpansOf(
      [
        { startMin: 0, durationMin: 120 },
        { startMin: 210, durationMin: EVENING_MIN - 210 },
      ],
      EVENING_MIN,
    ),
    [{ startMin: 120, durationMin: 90 }],
  )
})

test('the hours before the first and after the last are unscheduled', () => {
  assert.deepEqual(
    unscheduledSpansOf([{ startMin: 60, durationMin: 60 }], EVENING_MIN),
    [
      { startMin: 0, durationMin: 60 },
      { startMin: 120, durationMin: EVENING_MIN - 120 },
    ],
  )
})

/**
 * The programmes arrive in whatever order the API listed them, and a broadcast
 * that runs past the end of the window is clipped by the window rather than
 * pushing the runs past it.
 */
test('programmes out of order, overlapping or overrunning still leave the same runs', () => {
  assert.deepEqual(
    unscheduledSpansOf(
      [
        { startMin: 400, durationMin: 200 },
        { startMin: 0, durationMin: 60 },
        { startMin: 30, durationMin: 60 },
      ],
      EVENING_MIN,
    ),
    [{ startMin: 90, durationMin: 310 }],
  )
})

test('a programme that started before the window does not shift the runs back', () => {
  assert.deepEqual(
    unscheduledSpansOf([{ startMin: -30, durationMin: 60 }], EVENING_MIN),
    [{ startMin: 30, durationMin: EVENING_MIN - 30 }],
  )
})
