import assert from 'node:assert/strict'
import { test } from 'node:test'

import { foldedLineupOf, foldsAChannel } from './live-lineup.ts'

const AT_SEVEN = {
  startsAt: '2026-09-04T10:00:00Z',
  endsAt: '2026-09-04T10:55:00Z',
  title: 'ニュース',
}

/** A station with two splits, both carrying what the station is carrying. */
const REPEATED = [
  { id: 'a-1', now: AT_SEVEN },
  { id: 'a-2', sub: true, whole: 'a-1', now: AT_SEVEN },
  { id: 'a-3', sub: true, whole: 'a-1', now: AT_SEVEN },
  { id: 'b-1', now: { ...AT_SEVEN, title: '中継' } },
]

test('the splits repeating their station come out, and the station stays', () => {
  assert.deepEqual(
    foldedLineupOf(REPEATED).map((channel) => channel.id),
    ['a-1', 'b-1'],
  )
})

test('a split showing something of its own keeps its card', () => {
  const lineUp = [
    ...REPEATED.slice(0, 2),
    {
      id: 'a-3',
      sub: true,
      whole: 'a-1',
      now: { ...AT_SEVEN, title: '高校野球' },
    },
  ]

  assert.deepEqual(
    foldedLineupOf(lineUp).map((channel) => channel.id),
    ['a-1', 'a-3'],
  )
})

test('a station whose listings have not arrived keeps its card; a split with nothing on it does not', () => {
  const lineUp = [
    { id: 'a-1' },
    { id: 'a-2', sub: true, whole: 'a-1' },
    { id: 'b-1', now: AT_SEVEN },
  ]

  assert.deepEqual(
    foldedLineupOf(lineUp).map((channel) => channel.id),
    ['a-1', 'b-1'],
  )
})

test('the same programme at another hour is not a repetition', () => {
  const lineUp = [
    { id: 'a-1', now: AT_SEVEN },
    {
      id: 'a-2',
      sub: true,
      whole: 'a-1',
      now: { ...AT_SEVEN, startsAt: '2026-09-04T11:00:00Z' },
    },
  ]

  assert.deepEqual(
    foldedLineupOf(lineUp).map((channel) => channel.id),
    ['a-1', 'a-2'],
  )
})

test('another station carrying the same broadcast is not repeating it', () => {
  const lineUp = [
    { id: 'a-1', now: AT_SEVEN },
    { id: 'b-1', now: AT_SEVEN },
  ]

  assert.deepEqual(
    foldedLineupOf(lineUp).map((channel) => channel.id),
    ['a-1', 'b-1'],
  )
})

test('the channel being watched keeps its card even where it is a repetition', () => {
  assert.deepEqual(
    foldedLineupOf(REPEATED, 'a-2').map((channel) => channel.id),
    ['a-1', 'a-2', 'b-1'],
  )
})

test('the press is offered where it would take a card, and nowhere else', () => {
  assert.equal(foldsAChannel(REPEATED), true)
  assert.equal(foldsAChannel(REPEATED, 'a-2'), true)
  assert.equal(foldsAChannel([{ id: 'a-1', now: AT_SEVEN }]), false)
  assert.equal(
    foldsAChannel([
      { id: 'a-1', now: AT_SEVEN },
      {
        id: 'a-2',
        sub: true,
        whole: 'a-1',
        now: { ...AT_SEVEN, title: '高校野球' },
      },
    ]),
    false,
  )
})
