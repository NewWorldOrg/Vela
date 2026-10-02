import assert from 'node:assert/strict'
import { test } from 'node:test'

import { checkedOutOf } from '@/lib/selection'

test('the box is clear while nothing is picked, over an empty list as well', () => {
  assert.equal(checkedOutOf(0, 5), false)
  assert.equal(checkedOutOf(0, 0), false)
})

test('the box is ticked once every listed row is picked', () => {
  assert.equal(checkedOutOf(5, 5), true)
  assert.equal(checkedOutOf(1, 1), true)
})

test('the box sits in between while only some of the rows are picked', () => {
  assert.equal(checkedOutOf(1, 5), 'indeterminate')
  assert.equal(checkedOutOf(4, 5), 'indeterminate')
})
