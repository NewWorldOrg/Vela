import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  everyShownPicked,
  keepsChoosing,
  pickedSaying,
  pressedPick,
  withEveryShown,
} from '@/lib/library-picking'

const SHOWN = ['a', 'b', 'c', 'd', 'e']

function set(...ids: string[]): ReadonlySet<string> {
  return new Set(ids)
}

test('a press takes a recording in, and a second press leaves it out', () => {
  assert.deepEqual([...pressedPick(set(), SHOWN, 'b')], ['b'])
  assert.deepEqual([...pressedPick(set('b', 'c'), SHOWN, 'b')], ['c'])
})

test('a press with Shift takes in every recording from the one pressed before', () => {
  assert.deepEqual([...pressedPick(set('b'), SHOWN, 'd', 'b')].sort(), [
    'b',
    'c',
    'd',
  ])
  assert.deepEqual([...pressedPick(set('d'), SHOWN, 'b', 'd')].sort(), [
    'b',
    'c',
    'd',
  ])
})

test('a press with Shift on a taken recording leaves the range out', () => {
  assert.deepEqual(
    [...pressedPick(set('a', 'b', 'c', 'd'), SHOWN, 'd', 'b')].sort(),
    ['a'],
  )
})

test('a press with Shift and nothing pressed before is a plain press', () => {
  assert.deepEqual([...pressedPick(set(), SHOWN, 'c', undefined)], ['c'])
  assert.deepEqual([...pressedPick(set(), SHOWN, 'c', 'gone')], ['c'])
})

test('every shown recording is taken, and the ones outside what is shown are left out', () => {
  assert.deepEqual([...withEveryShown(set('z'), ['a', 'b'])].sort(), ['a', 'b'])
})

test('with every shown recording taken, every one is left out', () => {
  assert.deepEqual([...withEveryShown(set('a', 'b'), ['a', 'b'])], [])
})

test('every shown recording is picked only when there is one and none is left out', () => {
  assert.equal(everyShownPicked(set('a', 'b'), ['a', 'b']), true)
  assert.equal(everyShownPicked(set('a'), ['a', 'b']), false)
  assert.equal(everyShownPicked(set(), []), false)
})

test('the choosing row says how many are taken, or that recordings are to be chosen', () => {
  assert.equal(pickedSaying(0), '録画を選ぶ')
  assert.equal(pickedSaying(3), '3 件を選択')
})

test('choosing stops once the picked recordings are gone, but waits at none right after 選ぶ', () => {
  assert.equal(keepsChoosing(2, true), true)
  assert.equal(keepsChoosing(0, true), false)
  assert.equal(keepsChoosing(0, false), true)
})
