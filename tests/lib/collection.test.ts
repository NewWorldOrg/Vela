import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { STREAM_OUTCOME_LABEL } from '@/lib/collection'
import { NOT_YET_IN_THIS_BUILD, wordFor } from '@/lib/not-yet-in-this-build'

type Outcome = keyof typeof STREAM_OUTCOME_LABEL

const LATER = 'somethingTheApiAddedLater' as string

function vocabulary(): string[] {
  const document: unknown = JSON.parse(
    readFileSync(
      new URL('../../repository/client/carina.json', import.meta.url),
      'utf8',
    ),
  )
  const named = (
    document as { components: { schemas: Record<string, { enum?: string[] }> } }
  ).components.schemas.StreamCollectionOutcome?.enum

  assert.ok(named, 'StreamCollectionOutcome が生成クライアントの列挙にない')

  return named
}

test('巡回の結果は、API が持つどの値も日本語で言える', () => {
  for (const value of vocabulary()) {
    const said = wordFor(STREAM_OUTCOME_LABEL, value as Outcome)

    assert.notEqual(said, NOT_YET_IN_THIS_BUILD, `${value} の言い方がない`)
    assert.doesNotMatch(said, /[A-Za-z]/, `${value} が内部の語を出している`)
  }
})

test('この版が知らない巡回の結果でも日本語で閉じる', () => {
  const said = wordFor(STREAM_OUTCOME_LABEL, LATER as Outcome)

  assert.equal(said, NOT_YET_IN_THIS_BUILD)
  assert.doesNotMatch(said, /somethingTheApiAddedLater/)
})
