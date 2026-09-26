import assert from 'node:assert/strict'
import { test } from 'node:test'

import { holdWhileClosing } from '@/hooks/useHeldWhileClosing'

test('a face keeps what it was opened with while it closes', () => {
  const opened = holdWhileClosing({ value: null, held: null }, 'a')

  assert.deepEqual(opened, { value: 'a', held: 'a', openedAnew: true })

  const closing = holdWhileClosing(opened, null)

  assert.deepEqual(closing, { value: null, held: 'a', openedAnew: false })
})

test('a face opened on something else draws the new thing at once', () => {
  const reopened = holdWhileClosing({ value: null, held: 'a' }, 'b')

  assert.deepEqual(reopened, { value: 'b', held: 'b', openedAnew: true })
})

test('nothing moves while the value stays the same', () => {
  assert.equal(holdWhileClosing({ value: 'a', held: 'a' }, 'a'), undefined)
  assert.equal(holdWhileClosing({ value: null, held: 'a' }, null), undefined)
})
