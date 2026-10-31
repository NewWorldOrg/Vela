import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  byDay,
  calendarDayOf,
  dayHeadingOf,
  goesOnFrom,
  minutesLeftOf,
  watchedShareOf,
  watchStateOf,
} from '@/lib/library-days'

const NOW = new Date('2026-10-30T12:04:00Z')

test('a moment falls on its day in Tokyo, not in the machine’s own zone', () => {
  assert.equal(calendarDayOf('2026-10-29T15:30:00Z'), '2026-10-30')
  assert.equal(calendarDayOf('2026-10-29T14:59:59Z'), '2026-10-29')
})

test('today, yesterday and tomorrow are headed by name, other days by their date alone', () => {
  assert.deepEqual(dayHeadingOf('2026-10-30', NOW), {
    near: '今日',
    date: '10/30(金)',
  })
  assert.deepEqual(dayHeadingOf('2026-10-29', NOW), {
    near: '昨日',
    date: '10/29(木)',
  })
  assert.deepEqual(dayHeadingOf('2026-10-31', NOW), {
    near: '明日',
    date: '10/31(土)',
  })
  assert.deepEqual(dayHeadingOf('2026-10-27', NOW), { date: '10/27(火)' })
})

test('recordings are gathered under the day they started on, newest first as given', () => {
  const grouped = byDay([
    { id: 'a', startedAt: '2026-10-30T11:00:00Z' },
    { id: 'b', startedAt: '2026-10-30T02:00:00Z' },
    { id: 'c', startedAt: '2026-10-29T12:00:00Z' },
  ])

  assert.deepEqual(
    grouped.map(({ day, items }) => [day, items.map((one) => one.id)]),
    [
      ['2026-10-30', ['a', 'b']],
      ['2026-10-29', ['c']],
    ],
  )
})

test('only a recording watched past its first moments and not to its end goes on from where it was left', () => {
  assert.equal(goesOnFrom({ watchedSec: 754, lengthSec: 1798 }), true)
  assert.equal(goesOnFrom({ watchedSec: 10, lengthSec: 1798 }), false)
  assert.equal(goesOnFrom({ watchedSec: 1780, lengthSec: 1798 }), false)
  assert.equal(goesOnFrom({ lengthSec: 1798 }), false)
})

test('the minutes left and the share watched come from where it was left', () => {
  assert.equal(minutesLeftOf({ watchedSec: 754, lengthSec: 1798 }), 18)
  assert.equal(minutesLeftOf({ lengthSec: 1798 }), undefined)
  assert.equal(watchedShareOf({ watchedSec: 900, lengthSec: 1800 }), 0.5)
  assert.equal(watchedShareOf({ watchedSec: 900 }), undefined)
})

test('a recording is unwatched until it is watched past its first moments, and watched once it is as good as through', () => {
  assert.equal(watchStateOf({ lengthSec: 600 }), 'unwatched')
  assert.equal(watchStateOf({ watchedSec: 12, lengthSec: 600 }), 'unwatched')
  assert.equal(watchStateOf({ watchedSec: 240, lengthSec: 600 }), 'partway')
  assert.equal(watchStateOf({ watchedSec: 580, lengthSec: 600 }), 'watched')
  assert.equal(watchStateOf({ watchedSec: 240 }), 'partway')
})
