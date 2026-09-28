import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  Reservation,
  ReservationStanding,
} from '@/repository/reservations'
import {
  MARGIN_RANGE,
  leadingSegmentOf,
  linesOf,
  relaySpanOf,
  PRIORITY_RANGE,
  isDiscardable,
  isRestorable,
  recordingWasRemoved,
  reservationAnchor,
  reservationHref,
  wholeNumber,
  withinMargin,
  withinPriority,
} from '@/lib/reservations'

test('予約の行の錨は、その予約の id から綴られる', () => {
  assert.equal(reservationAnchor('r-309'), 'reservation-r-309')
})

test('録画から入るリンクは、その錨を名指す', () => {
  assert.equal(
    reservationHref('r-309'),
    '/reservations?show=all#reservation-r-309',
  )
})

test('録画から入るリンクは、既定で隠れる予約にも届く', () => {
  assert.match(reservationHref('r-309'), /\?show=all#/)
})

const STANDINGS: ReservationStanding[] = [
  'scheduled',
  'conflict',
  'cancelled',
  'missed',
  'recording',
  'complete',
  'truncated',
  'failed',
]

function table(
  recorded: boolean,
  windowClosed: boolean,
): Record<string, boolean> {
  return Object.fromEntries(
    STANDINGS.map((standing) => [
      standing,
      isDiscardable({ standing, recorded, windowClosed }),
    ]),
  )
}

const EVERY_STANDING: Record<ReservationStanding, true> = {
  scheduled: true,
  conflict: true,
  cancelled: true,
  missed: true,
  recording: true,
  complete: true,
  truncated: true,
  failed: true,
}

test('表は立ち位置を 1 つ残らず並べている', () => {
  assert.deepEqual([...STANDINGS].sort(), Object.keys(EVERY_STANDING).sort())
})

test('放送がまだ終わっていないとき、消せるのは録画に至らず立っていないものだけ', () => {
  assert.deepEqual(table(false, false), {
    scheduled: false,
    conflict: false,
    cancelled: true,
    missed: true,
    recording: false,
    complete: true,
    truncated: true,
    failed: true,
  })
})

test('放送が終わったあとは、競合で負けたものと予定のままのものも消せる', () => {
  assert.deepEqual(table(false, true), {
    scheduled: true,
    conflict: true,
    cancelled: true,
    missed: true,
    recording: false,
    complete: true,
    truncated: true,
    failed: true,
  })
})

test('録画が残っている予約は、放送が終わっていても消せない', () => {
  for (const windowClosed of [false, true]) {
    assert.deepEqual(
      table(true, windowClosed),
      Object.fromEntries(STANDINGS.map((standing) => [standing, false])),
      `windowClosed=${windowClosed}`,
    )
  }
})

test('録画中は、放送の終わりを過ぎていても消せない', () => {
  assert.equal(
    isDiscardable({
      standing: 'recording',
      recorded: false,
      windowClosed: true,
    }),
    false,
  )
})

test('録画から来た状態なのに録画が無ければ、その録画は削除されている', () => {
  for (const standing of ['complete', 'truncated', 'failed'] as const) {
    assert.equal(
      recordingWasRemoved({ standing, recorded: false }),
      true,
      standing,
    )
    assert.equal(
      recordingWasRemoved({ standing, recorded: true }),
      false,
      standing,
    )
  }
})

test('録画がまだ無くて当たり前の状態では、削除されたとは言わない', () => {
  for (const standing of [
    'scheduled',
    'conflict',
    'recording',
    'cancelled',
    'missed',
  ] as const) {
    assert.equal(
      recordingWasRemoved({ standing, recorded: false }),
      false,
      standing,
    )
  }
})

test('この版が知らない状態の予約は、破棄できるものとして数えない', () => {
  const unknown = 'somethingTheApiAddedLater' as ReservationStanding

  for (const windowClosed of [true, false]) {
    assert.equal(
      isDiscardable({ standing: unknown, recorded: false, windowClosed }),
      false,
      String(windowClosed),
    )
  }
})

test('復元できるのは、取り消した予約で放送がまだ終わっていないものだけ', () => {
  const restorable = (windowClosed: boolean) =>
    STANDINGS.filter((standing) =>
      isRestorable({ standing, recorded: false, windowClosed }),
    )

  assert.deepEqual(restorable(false), ['cancelled'])
  assert.deepEqual(restorable(true), [])
})

test('優先度は 1 から 99 までを、両端を含めて受け付ける', () => {
  assert.deepEqual(PRIORITY_RANGE, { least: 1, most: 99 })

  for (const value of [1, 50, 99]) {
    assert.equal(withinPriority(value), true, String(value))
  }

  for (const value of [0, 100, -1, Number.NaN]) {
    assert.equal(withinPriority(value), false, String(value))
  }
})

test('マージンは 0 から 3600 秒までを、両端を含めて受け付ける', () => {
  assert.deepEqual(MARGIN_RANGE, { least: 0, most: 3600 })

  for (const value of [0, 60, 3600]) {
    assert.equal(withinMargin(value), true, String(value))
  }

  for (const value of [-1, 3601, Number.NaN]) {
    assert.equal(withinMargin(value), false, String(value))
  }
})

test('打ち込まれた整数は、前後の空白を除いて数として読む', () => {
  assert.equal(wholeNumber('12'), 12)
  assert.equal(wholeNumber('  30 '), 30)
  assert.equal(wholeNumber('007'), 7)
  assert.equal(wholeNumber('0'), 0)
})

test('空欄と、符号・小数・指数・文字の混じったものは整数として読まない', () => {
  for (const typed of [
    '',
    '   ',
    '-1',
    '+3',
    '1.5',
    '1e3',
    '12分',
    '0x10',
    '1 2',
  ]) {
    assert.equal(wholeNumber(typed), undefined, typed)
  }
})

const plain = (id: string, over: Partial<Reservation> = {}): Reservation => ({
  id,
  title: `番組 ${id}`,
  channelName: '中央テレビ1',
  whenLabel: '',
  origin: '手動',
  standing: 'scheduled',
  endAtConfirmed: true,
  receptionUnavailable: false,
  priority: 10,
  marginBeforeSeconds: 0,
  marginAfterSeconds: 0,
  encodeWhenRecorded: true,
  discardable: false,
  restorable: false,
  ...over,
})

const segment = (
  id: string,
  startAt: string,
  endAt: string,
  over: Partial<Reservation> = {},
): Reservation =>
  plain(id, { relay: { key: 'relay:1-2-3', startAt, endAt }, ...over })

test('中継の区切りが 2 つ以上並ぶと、1 つの塊にまとまる', () => {
  const lines = linesOf([
    plain('a'),
    segment('b', '2026-09-28T10:00:00Z', '2026-09-28T11:00:00Z'),
    plain('c'),
    segment('d', '2026-09-28T11:00:00Z', '2026-09-28T12:00:00Z'),
  ])

  assert.deepEqual(
    lines.map((line) =>
      line.kind === 'one'
        ? line.reservation.id
        : line.segments.map((one) => one.id).join('+'),
    ),
    ['a', 'b+d', 'c'],
  )
})

test('区切りは開始の順に並ぶ', () => {
  const lines = linesOf([
    segment('late', '2026-09-28T11:00:00Z', '2026-09-28T12:00:00Z'),
    segment('early', '2026-09-28T10:00:00Z', '2026-09-28T11:00:00Z'),
  ])

  assert.equal(lines.length, 1)
  assert.deepEqual(
    lines[0].kind === 'relay' ? lines[0].segments.map((one) => one.id) : [],
    ['early', 'late'],
  )
})

test('区切りが 1 つしか残っていなければ、ふつうの行のまま', () => {
  const lines = linesOf([
    segment('b', '2026-09-28T10:00:00Z', '2026-09-28T11:00:00Z'),
  ])

  assert.deepEqual(lines, [
    {
      kind: 'one',
      reservation: segment('b', '2026-09-28T10:00:00Z', '2026-09-28T11:00:00Z'),
    },
  ])
})

test('別の中継の区切りは、別の塊になる', () => {
  const lines = linesOf([
    segment('a', '2026-09-28T10:00:00Z', '2026-09-28T11:00:00Z'),
    segment('b', '2026-09-28T11:00:00Z', '2026-09-28T12:00:00Z'),
    segment('c', '2026-09-28T20:00:00Z', '2026-09-28T21:00:00Z', {
      relay: {
        key: 'relay:9-9-9',
        startAt: '2026-09-28T20:00:00Z',
        endAt: '2026-09-28T21:00:00Z',
      },
    }),
  ])

  assert.deepEqual(
    lines.map((line) => line.kind),
    ['relay', 'one'],
  )
})

test('塊の時間は、最初の区切りの開始から最後の区切りの終了まで', () => {
  assert.deepEqual(
    relaySpanOf([
      segment('a', '2026-09-28T10:00:00Z', '2026-09-28T11:00:00Z'),
      segment('b', '2026-09-28T11:00:00Z', '2026-09-28T12:30:00Z'),
    ]),
    { startAt: '2026-09-28T10:00:00Z', endAt: '2026-09-28T12:30:00Z' },
  )
})

test('塊の状態は、先に見るべき区切りのもの', () => {
  const standings: ReservationStanding[] = [
    'scheduled',
    'conflict',
    'cancelled',
  ]

  assert.equal(
    leadingSegmentOf(
      standings.map((standing, at) => plain(`s${at}`, { standing })),
    ).standing,
    'conflict',
  )
  assert.equal(
    leadingSegmentOf([
      plain('x', { standing: 'scheduled' }),
      plain('y', { standing: 'recording' }),
    ]).id,
    'y',
  )
})

test('取消だけの塊は、同じ放送による取消を人の取消より先に言う', () => {
  assert.equal(
    leadingSegmentOf([
      plain('by-hand', { standing: 'cancelled' }),
      plain('same', { standing: 'cancelled', sameBroadcast: true }),
    ]).id,
    'same',
  )
})

test('区切りの状態が全部同じなら、最初の区切りが塊を言う', () => {
  assert.equal(leadingSegmentOf([plain('first'), plain('second')]).id, 'first')
})
