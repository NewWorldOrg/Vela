import assert from 'node:assert/strict'
import { test } from 'node:test'

import { channelBeingWatched, choiceStillStands } from '@/lib/live-choice'

test('with nothing chosen in this browser, the page answers for itself', () => {
  assert.equal(channelBeingWatched(undefined, 'a-1'), 'a-1')
})

test('the channel just chosen is the one being watched, before the page has answered', () => {
  assert.equal(
    channelBeingWatched({ answered: 'a-1', chosen: 'b-1' }, 'a-1'),
    'b-1',
  )
})

test('the page catching up says the same channel, so nothing moves', () => {
  assert.equal(
    channelBeingWatched({ answered: 'a-1', chosen: 'b-1' }, 'b-1'),
    'b-1',
  )
})

test('a choice the page has already answered is spent, and does not come back when the page returns to where it was made', () => {
  const choice = { answered: 'a-1', chosen: 'b-1' }

  assert.equal(choiceStillStands(choice, 'b-1'), undefined)
  assert.equal(channelBeingWatched(undefined, 'a-1'), 'a-1')
})

test('the page answering with a third channel wins over a choice made against another answer', () => {
  assert.equal(
    channelBeingWatched({ answered: 'a-1', chosen: 'b-1' }, 'c-1'),
    'c-1',
  )
})

test('while a channel is being watched, some channel always carries the mark', () => {
  const answers = ['a-1', 'b-1', 'c-1']
  const choices = [
    undefined,
    { answered: 'a-1', chosen: 'b-1' },
    { answered: 'b-1', chosen: 'a-1' },
  ]

  for (const answered of answers) {
    for (const choice of choices) {
      assert.notEqual(channelBeingWatched(choice, answered), undefined)
    }
  }
})

test('watching nothing marks nothing', () => {
  assert.equal(channelBeingWatched(undefined, undefined), undefined)
})
