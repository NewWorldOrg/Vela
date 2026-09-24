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
  newcomersOf,
  GUIDE_HOLD_MS,
  glyphLoadsOf,
  glyphsOf,
  GUIDE_FACES,
  PANEL_TITLE_FACE,
} from '@/lib/arrival'

test('a delay is handed over as a custom property, never as a number', () => {
  assert.deepEqual(delayOf(120), { '--delay': '120ms' })
  assert.deepEqual(groupDelayOf(0), { '--d': '0ms' })
})

test('rows are held back one step at a time, and the rest hold the last delay', () => {
  assert.deepEqual(
    Array.from({ length: LAST_ROW_HELD_BACK }, (_, nth) => rowDelayMs(nth)),
    [0, 40, 80, 120, 160, 200],
  )
  assert.equal(ROW_STEP_MS, 40)
  assert.equal(rowDelayMs(LAST_ROW_HELD_BACK), 200)
  assert.equal(rowDelayMs(400), 200)
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
  assert.equal(ARRIVAL_SPAN_MS, GUIDE_HOLD_MS + RISE_MS + GRID_CAP_MS + 100)
})

test('only what was not in the line-up just before counts as having joined', () => {
  assert.deepEqual(
    [...newcomersOf(['a', 'b'], ['a', 'x', 'b', 'y'])],
    ['x', 'y'],
  )
  assert.deepEqual([...newcomersOf(['a', 'b', 'c'], ['a', 'c'])], [])
  assert.deepEqual([...newcomersOf([], ['a'])], ['a'])
})

test('the glyphs a guide will draw are gathered once, each only once', () => {
  assert.equal(glyphsOf(['番組表', '表示', 'NHK 1']), '番組表示NHK 1')
  assert.equal(glyphsOf([]), '')
})

test('each face and weight the guide draws in is loaded ahead of scrolling', () => {
  assert.deepEqual(GUIDE_FACES, [
    '400 1em "Broadcast Marks"',
    '400 1em "Zen Kaku Gothic New"',
    '500 1em "Zen Kaku Gothic New"',
    '700 1em "Zen Kaku Gothic New"',
    '500 1em "M PLUS 1 Code"',
  ])
})

test('the titles are also loaded in the face the detail panel heads them with', () => {
  assert.equal(PANEL_TITLE_FACE, '700 1em "Zen Maru Gothic"')
  assert.deepEqual(glyphLoadsOf(['NHK 1', '番組'], ['番組', '表']), [
    ...GUIDE_FACES.map((face) => [face, 'NHK 1番組']),
    [PANEL_TITLE_FACE, '番組表'],
  ])
})

test('nothing is loaded for a guide with no text', () => {
  assert.deepEqual(glyphLoadsOf([], []), [])
  assert.deepEqual(glyphLoadsOf([], ['題']), [[PANEL_TITLE_FACE, '題']])
})

test('the guide holds its columns still until its first picture is on screen', () => {
  assert.equal(GUIDE_HOLD_MS, 160)
})
