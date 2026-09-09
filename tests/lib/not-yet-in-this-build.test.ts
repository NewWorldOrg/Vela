import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  NOT_YET_IN_THIS_BUILD,
  NOT_YET_IN_THIS_BUILD_SAYING,
  shapeFor,
  wordFor,
} from '@/lib/not-yet-in-this-build'

type Named = 'first' | 'second'

const WORDS: Record<Named, string> = { first: '一つ目', second: '二つ目' }

const SHAPES: Record<Named, { tone: string }> = {
  first: { tone: 'ok' },
  second: { tone: 'err' },
}

const SOMETIMES_NOTHING: Record<Named, string | undefined> = {
  first: undefined,
  second: '二つ目',
}

const NEW_TO_THIS_BUILD = 'somethingTheApiAddedLater' as string

test('a word the table holds is the word that comes back', () => {
  assert.equal(wordFor(WORDS, 'first'), '一つ目')
})

test('a value this build has no row for is said in Japanese, not shown as it arrived', () => {
  const said = wordFor(WORDS, NEW_TO_THIS_BUILD as Named)

  assert.equal(said, NOT_YET_IN_THIS_BUILD)
  assert.doesNotMatch(said, /somethingTheApiAddedLater/)
})

test('a shape this build has no row for is the alternative that was named', () => {
  assert.deepEqual(
    shapeFor(SHAPES, NEW_TO_THIS_BUILD as Named, { tone: 'mute' }),
    {
      tone: 'mute',
    },
  )
})

test('a row that holds nothing is still a row, not a value this build is missing', () => {
  assert.equal(shapeFor(SOMETIMES_NOTHING, 'first', '代わりの語'), undefined)
})

test('a name every object carries is not mistaken for a row of the table', () => {
  assert.equal(wordFor(WORDS, 'toString' as Named), NOT_YET_IN_THIS_BUILD)
  assert.equal(wordFor(WORDS, 'constructor' as Named), NOT_YET_IN_THIS_BUILD)
})

test('the two alternatives are Japanese, and the sentence ends as a sentence', () => {
  assert.doesNotMatch(NOT_YET_IN_THIS_BUILD, /[A-Za-z]/)
  assert.doesNotMatch(NOT_YET_IN_THIS_BUILD_SAYING, /[A-Za-z]/)
  assert.ok(NOT_YET_IN_THIS_BUILD_SAYING.endsWith('。'))
})
