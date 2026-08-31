import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { ReservationStanding } from '@/repository/reservations'
import {
  isDiscardable,
  reservationAnchor,
  reservationHref,
} from './reservations.ts'

/**
 * The anchor a reservation's row carries and the link the recording screen
 * sends the reader in on. Both are spelled out here rather than one derived
 * from the other, so a change to either spelling has to be a change here too:
 * building the expected link out of `reservationAnchor` would move the
 * goalposts with it and hold nothing.
 */
test('予約の行の錨は、その予約の id から綴られる', () => {
  assert.equal(reservationAnchor('r-309'), 'reservation-r-309')
})

test('録画から入るリンクは、その錨を名指す', () => {
  assert.equal(reservationHref('r-309'), '/reservations#reservation-r-309')
})

/**
 * 予約を消せるかどうかの判定。8 つの立ち位置すべてを表に並べ、表全体を一度に
 * 突き合わせる。「消せないものは false」だけを見ると、常に false を返す実装で
 * も緑になるため、消せる側と消せない側の両方を同じ表で押さえる。
 *
 * 表は `Record<ReservationStanding, …>` なので、立ち位置が増えたときは型が先に
 * 落ちる。
 */

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
