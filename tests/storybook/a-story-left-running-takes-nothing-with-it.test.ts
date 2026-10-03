import assert from 'node:assert/strict'
import { test } from 'node:test'

import { StoryTurns } from '@/.storybook/story-turns'

test('a story that ended leaves the page to the next one', () => {
  const turns = new StoryTurns()

  assert.equal(turns.begin('first'), false)
  assert.equal(turns.end('first'), true)
  assert.equal(turns.begin('second'), false)
})

test('a story still running when the next begins is told apart', () => {
  const turns = new StoryTurns()

  turns.begin('timed-out')

  assert.equal(turns.begin('next'), true)
  assert.equal(turns.end('timed-out'), false)
  assert.equal(turns.end('next'), true)
})

test('a story begun again after its page was reset is the same turn', () => {
  const turns = new StoryTurns()

  turns.begin('retried')

  assert.equal(turns.begin('retried'), false)
  assert.equal(turns.end('retried'), true)
})

test('a story that ends late, after the next one ended, is still not let in', () => {
  const turns = new StoryTurns()

  turns.begin('timed-out')
  turns.begin('next')
  turns.end('next')

  assert.equal(turns.end('timed-out'), false)
  assert.equal(turns.begin('after'), false)
})
