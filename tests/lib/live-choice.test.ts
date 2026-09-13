import assert from 'node:assert/strict'
import { test } from 'node:test'

import { channelBeingWatched, choiceStillStands } from '@/lib/live-choice'

test('with nothing chosen in this browser, the url says which channel is being watched', () => {
  assert.equal(channelBeingWatched(undefined, 'a-1', 'a-1'), 'a-1')
})

test('the channel just chosen is the one being watched, before the url has caught up', () => {
  assert.equal(
    channelBeingWatched({ asked: 'a-1', chosen: 'b-1' }, 'a-1', 'a-1'),
    'b-1',
  )
})

test('the url catching up says the same channel, so nothing moves while the page is still answering', () => {
  assert.equal(
    channelBeingWatched({ asked: 'a-1', chosen: 'b-1' }, 'b-1', 'a-1'),
    'b-1',
  )
})

test('a choice the url has already carried is spent, and does not come back when the url returns to where it was made', () => {
  const choice = { asked: 'a-1', chosen: 'b-1' }
  const spent = choiceStillStands(choice, 'b-1')

  assert.equal(spent, undefined)
  assert.equal(channelBeingWatched(spent, 'a-1', 'a-1'), 'a-1')
})

test('a choice made against another url is not read as the answer to this one', () => {
  assert.equal(
    channelBeingWatched({ asked: 'a-1', chosen: 'b-1' }, 'c-1', 'c-1'),
    'c-1',
  )
})

test('the url leads while the page is still answering with where it came from', () => {
  assert.equal(channelBeingWatched(undefined, 'b-1', 'a-1'), 'b-1')
})

test('the page answers for a url that asks for nothing', () => {
  assert.equal(channelBeingWatched(undefined, undefined, 'a-1'), 'a-1')
})

test('while a channel is being watched, some channel always carries the mark', () => {
  const urls = ['a-1', 'b-1', 'c-1']
  const choices = [
    undefined,
    { asked: 'a-1', chosen: 'b-1' },
    { asked: 'b-1', chosen: 'a-1' },
  ]

  for (const asked of urls) {
    for (const choice of choices) {
      assert.notEqual(channelBeingWatched(choice, asked, 'a-1'), undefined)
    }
  }
})

test('watching nothing marks nothing', () => {
  assert.equal(channelBeingWatched(undefined, undefined, undefined), undefined)
})
