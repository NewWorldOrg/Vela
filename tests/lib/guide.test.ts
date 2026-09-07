import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { GuideRelationKind } from '@/lib/guide'
import {
  broadcastDateOf,
  foldedGuideOf,
  foldsAColumn,
  gridMinWidthOf,
  isOnAir,
  nowMinOf,
  openingScrollTopOf,
  sharesWith,
  servicesSettled,
  unscheduledSpansOf,
  windowStartOf,
} from '@/lib/guide'

const HOUR_PX = 96

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

const WHOLE = { networkId: 41000, serviceId: 5100 }
const SPLIT = { networkId: 41000, serviceId: 5101 }
const SPLIT_AGAIN = { networkId: 41000, serviceId: 5102 }

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

const AT = (hour: number) =>
  `2026-08-20T${String(hour).padStart(2, '0')}:00:00Z`

const carrying = (
  service: { networkId: number; serviceId: number },
  name: string,
  ...related: {
    kind: GuideRelationKind
    networkId: number
    serviceId: number
  }[]
) => ({ ...service, name, startsAt: AT(12), endsAt: AT(13), related })

const at = <B extends { startsAt: string; endsAt?: string }>(
  broadcast: B,
  hour: number,
  hours = 1,
) => ({ ...broadcast, startsAt: AT(hour), endsAt: AT(hour + hours) })

test('the service of a network takes a column and keeps all of it', () => {
  const own = carrying(WHOLE, 'the evening news')
  const settled = servicesSettled([WHOLE], [own])

  assert.deepEqual(settled.services, [
    { service: WHOLE, sub: false, whole: WHOLE },
  ])
  assert.deepEqual(settled.carried, [{ service: WHOLE, broadcast: own }])
})

test('a service that has split carries its own hours and shares the rest', () => {
  const news = at(
    carrying(WHOLE, 'the evening news', { kind: 'shared', ...SPLIT }),
    18,
  )
  const half = at(carrying(WHOLE, 'the second half'), 19)
  const own = at(carrying(SPLIT, 'the other match'), 19)
  const settled = servicesSettled([WHOLE, SPLIT], [news, half, own])

  assert.deepEqual(settled.services, [
    { service: WHOLE, sub: false, whole: WHOLE },
    { service: SPLIT, sub: true, whole: WHOLE },
  ])
  assert.deepEqual(settled.carried, [
    { service: WHOLE, broadcast: news },
    { service: WHOLE, broadcast: half },
    { service: SPLIT, broadcast: own },
    { service: SPLIT, broadcast: news },
  ])
})

test('a shared hour reaches the split however the broadcaster spells it', () => {
  const spelt = at(
    carrying(WHOLE, 'the shopping hour', { kind: 'shared', ...SPLIT }),
    15,
  )
  const copied = at(
    carrying(SPLIT, 'the shopping hour', { kind: 'shared', ...WHOLE }),
    15,
  )

  assert.deepEqual(
    servicesSettled([WHOLE, SPLIT], [spelt]).carried.filter(
      ({ service }) => service === SPLIT,
    ),
    [{ service: SPLIT, broadcast: spelt }],
  )
  assert.deepEqual(
    servicesSettled(
      [WHOLE, SPLIT],
      [at(carrying(WHOLE, 'the shopping hour'), 15), copied],
    ).carried.filter(({ service }) => service === SPLIT),
    [{ service: SPLIT, broadcast: copied }],
  )
})

test('a share is not drawn over an hour the split already carries', () => {
  const named = at(
    carrying(WHOLE, 'the shopping hour', { kind: 'shared', ...SPLIT }),
    15,
  )
  const copy = at(
    carrying(SPLIT, 'the shopping hour', { kind: 'shared', ...WHOLE }),
    15,
  )
  const settled = servicesSettled([WHOLE, SPLIT], [named, copy])

  assert.deepEqual(
    settled.carried.filter(({ service }) => service === SPLIT),
    [{ service: SPLIT, broadcast: copy }],
  )
})

test('a service sharing every hour of the day still takes its column', () => {
  const news = at(
    carrying(WHOLE, 'the evening news', { kind: 'shared', ...SPLIT }),
    18,
  )
  const settled = servicesSettled([WHOLE, SPLIT], [news])

  assert.deepEqual(settled.services, [
    { service: WHOLE, sub: false, whole: WHOLE },
    { service: SPLIT, sub: true, whole: WHOLE },
  ])
  assert.deepEqual(settled.carried, [
    { service: WHOLE, broadcast: news },
    { service: SPLIT, broadcast: news },
  ])
})

test('a service with nothing listed at all keeps an empty column', () => {
  const settled = servicesSettled(
    [WHOLE, SPLIT],
    [carrying(WHOLE, 'the evening news')],
  )

  assert.deepEqual(settled.services, [
    { service: WHOLE, sub: false, whole: WHOLE },
    { service: SPLIT, sub: true, whole: WHOLE },
  ])
  assert.deepEqual(
    settled.carried.map(({ service }) => service.serviceId),
    [WHOLE.serviceId],
  )
})

test('only a share fills a column, never a relay or a move', () => {
  const relayed = at(
    carrying(WHOLE, 'the late film', { kind: 'relayed', ...SPLIT }),
    23,
  )
  const settled = servicesSettled([WHOLE, SPLIT], [relayed])

  assert.deepEqual(
    settled.carried.map(({ service }) => service.serviceId),
    [WHOLE.serviceId],
  )
})

test('the whole service is the lowest numbered, in whatever order it arrives', () => {
  const settled = servicesSettled(
    [SPLIT, WHOLE],
    [carrying(WHOLE, 'the evening news', { kind: 'shared', ...SPLIT })],
  )

  assert.deepEqual(settled.services, [
    { service: SPLIT, sub: true, whole: WHOLE },
    { service: WHOLE, sub: false, whole: WHOLE },
  ])
})

test('a third service is a split of the whole, not of the second', () => {
  const settled = servicesSettled(
    [WHOLE, SPLIT, SPLIT_AGAIN],
    [carrying(WHOLE, 'the evening news')],
  )

  assert.deepEqual(
    settled.services.map(({ service, sub }) => [service.serviceId, sub]),
    [
      [WHOLE.serviceId, false],
      [SPLIT.serviceId, true],
      [SPLIT_AGAIN.serviceId, true],
    ],
  )
})

test('each network is settled on its own', () => {
  const settled = servicesSettled(
    [WHOLE, SPLIT, ELSEWHERE],
    [
      carrying(WHOLE, 'the evening news', { kind: 'shared', ...SPLIT }),
      carrying(ELSEWHERE, 'the late film'),
    ],
  )

  assert.deepEqual(
    settled.services.map(({ service, sub }) => [service.serviceId, sub]),
    [
      [WHOLE.serviceId, false],
      [SPLIT.serviceId, true],
      [ELSEWHERE.serviceId, false],
    ],
  )
  assert.deepEqual(
    settled.carried
      .filter(({ service }) => service === ELSEWHERE)
      .map(({ broadcast }) => broadcast.name),
    ['the late film'],
  )
})

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

const AT_NINE = { startMin: 120, durationMin: 60 }

test('a programme that has begun and not ended is on air', () => {
  assert.equal(isOnAir(AT_NINE, 120), true)
  assert.equal(isOnAir(AT_NINE, 124), true)
  assert.equal(isOnAir(AT_NINE, 179), true)
})

test('a programme still to come, or already over, is not', () => {
  assert.equal(isOnAir(AT_NINE, 119), false)
  assert.equal(isOnAir(AT_NINE, 180), false)
})

test('a day with no present in it has nothing on air', () => {
  assert.equal(isOnAir(AT_NINE, undefined), false)
})

const LINE_UP = [
  { id: 'a-1', name: '総合1' },
  { id: 'a-2', name: '総合2', sub: true, whole: 'a-1' },
  { id: 'b-1', name: 'ローカル1' },
  { id: 'b-2', name: 'ローカル2', sub: true, whole: 'b-1' },
  { id: 'c-1', name: '情報が来ていない局' },
]

const evening = (
  channelId: string,
  title: string,
  startMin: number,
  durationMin: number,
) => ({ channelId, title, startMin, durationMin })

const CELLS = [
  evening('a-1', 'ニュース', 0, 60),
  evening('a-1', 'ドラマ', 60, 60),
  evening('a-2', 'ニュース', 0, 60),
  evening('a-2', 'ドラマ', 60, 60),
  evening('b-1', '演芸', 0, 60),
  evening('b-1', '生活情報', 60, 60),
  evening('b-2', '演芸', 0, 60),
  evening('b-2', '高校野球', 60, 60),
]

test('the fold takes the hours a split is repeating, not the split', () => {
  const folded = foldedGuideOf(LINE_UP, CELLS)

  assert.deepEqual(
    folded.programs.map((cell) => `${cell.channelId} ${cell.title}`),
    ['a-1 ニュース', 'a-1 ドラマ', 'b-1 演芸', 'b-1 生活情報', 'b-2 高校野球'],
  )
})

test('a split left with nothing loses its column, one with something keeps it', () => {
  const folded = foldedGuideOf(LINE_UP, CELLS)

  assert.deepEqual(
    folded.channels.map((channel) => channel.id),
    ['a-1', 'b-1', 'b-2', 'c-1'],
  )
})

test('the same name over other minutes is not a repetition', () => {
  const folded = foldedGuideOf(LINE_UP, [
    evening('a-1', 'ニュース', 0, 60),
    evening('a-2', 'ニュース', 60, 60),
    evening('b-1', '演芸', 0, 60),
    evening('b-2', '演芸', 0, 60),
  ])

  assert.deepEqual(
    folded.channels.map((channel) => channel.id),
    ['a-1', 'a-2', 'b-1', 'c-1'],
  )
})

test('a split is read against its own station', () => {
  const folded = foldedGuideOf(LINE_UP, [
    evening('a-1', '中継', 0, 60),
    evening('b-2', '中継', 0, 60),
  ])

  assert.deepEqual(
    folded.programs.map((cell) => cell.channelId),
    ['a-1', 'b-2'],
  )
})

test('a column that has not split is never folded away', () => {
  const folded = foldedGuideOf(LINE_UP, [])

  assert.deepEqual(
    folded.channels.map((channel) => channel.id),
    ['a-1', 'b-1', 'c-1'],
  )
})

test('a day with a column repeating another has a fold to offer', () => {
  assert.equal(foldsAColumn(LINE_UP, CELLS), true)
})

test('a day whose splits all have something of their own folds nothing', () => {
  assert.equal(
    foldsAColumn(LINE_UP, [
      evening('a-1', 'ニュース', 0, 60),
      evening('a-2', '高校野球', 0, 60),
      evening('b-1', '演芸', 0, 60),
      evening('b-2', '囲碁', 0, 60),
    ]),
    false,
  )
})

test('a day with no split at all folds nothing', () => {
  assert.equal(
    foldsAColumn(
      [
        { id: 'a-1', name: '総合1' },
        { id: 'b-1', name: 'ローカル1' },
      ],
      [evening('a-1', 'ニュース', 0, 60)],
    ),
    false,
  )
})
