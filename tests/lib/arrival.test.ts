import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  ARRIVAL_SPAN_MS,
  COLUMN_STEP_MS,
  GRID_CAP_MS,
  GRID_STEP_MS,
  LAST_COLUMN_HELD_BACK,
  LAST_ONE_THAT_MOVES,
  LAST_ROW_HELD_BACK,
  RISE_MS,
  ROW_STEP_MS,
  arrivesIn,
  columnDelayMs,
  delayOf,
  gridDelayMs,
  groupDelayOf,
  moves,
  nowLineDelayMs,
  risesIn,
  rowDelayMs,
  seatIn,
} from '@/lib/arrival'

test('a delay is handed over as a custom property, never as a number', () => {
  assert.deepEqual(delayOf(120), { '--delay': '120ms' })
  assert.deepEqual(groupDelayOf(0), { '--d': '0ms' })
})

test('rows are held back one step at a time, and only the first six', () => {
  assert.deepEqual(
    Array.from({ length: LAST_ROW_HELD_BACK }, (_, nth) => rowDelayMs(nth)),
    [0, 40, 80, 120, 160, 200],
  )
  assert.equal(ROW_STEP_MS, 40)
  assert.equal(rowDelayMs(LAST_ROW_HELD_BACK), 0)
  assert.equal(rowDelayMs(400), 0)
})

test('columns are held back to the eighth and then hold that delay', () => {
  assert.deepEqual(
    Array.from({ length: LAST_COLUMN_HELD_BACK }, (_, nth) =>
      columnDelayMs(nth),
    ),
    [0, 40, 80, 120, 160, 200, 240, 280],
  )
  assert.equal(COLUMN_STEP_MS, 40)
  assert.equal(columnDelayMs(400), (LAST_COLUMN_HELD_BACK - 1) * COLUMN_STEP_MS)
})

test('a grid arrives on the diagonal, capped', () => {
  assert.equal(gridDelayMs(0, 0), 0)
  assert.equal(gridDelayMs(1, 0), GRID_STEP_MS)
  assert.equal(gridDelayMs(1, 2), 3 * GRID_STEP_MS)
  assert.equal(gridDelayMs(20, 20), GRID_CAP_MS)
  assert.equal(GRID_STEP_MS, 30)
  assert.equal(GRID_CAP_MS, 240)
})

test('a seat in the grid is read across and then down', () => {
  assert.deepEqual(seatIn(0, 4), { row: 0, column: 0 })
  assert.deepEqual(seatIn(3, 4), { row: 0, column: 3 })
  assert.deepEqual(seatIn(4, 4), { row: 1, column: 0 })
  assert.deepEqual(seatIn(5, 0), { row: 5, column: 0 })
})

test('the line for now is drawn after the last column has risen', () => {
  assert.equal(
    nowLineDelayMs(),
    (LAST_COLUMN_HELD_BACK - 1) * COLUMN_STEP_MS + RISE_MS,
  )
})

test('only the first twelve parts of a list move at all', () => {
  assert.equal(LAST_ONE_THAT_MOVES, 12)
  assert.equal(moves(0), true)
  assert.equal(moves(LAST_ONE_THAT_MOVES - 1), true)
  assert.equal(moves(LAST_ONE_THAT_MOVES), false)
  assert.equal(arrivesIn(0), 'arrives')
  assert.equal(arrivesIn(400), '')
  assert.equal(risesIn(0), 'rises')
  assert.equal(risesIn(400), '')
})

test('the procession has an end the list can wait for', () => {
  assert.equal(ARRIVAL_SPAN_MS, RISE_MS + GRID_CAP_MS + 100)
})
