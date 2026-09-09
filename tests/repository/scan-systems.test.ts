import assert from 'node:assert/strict'
import { test } from 'node:test'

import { NOT_YET_IN_THIS_BUILD, wordFor } from '@/lib/not-yet-in-this-build'
import type { ScanSystem } from '@/repository/scan-systems'
import { SCAN_SYSTEMS, SYSTEM_LABEL } from '@/repository/scan-systems'

test('スキャンで選べる方式は、表が語を持つものだけ', () => {
  for (const { value } of SCAN_SYSTEMS) {
    assert.notEqual(wordFor(SYSTEM_LABEL, value), NOT_YET_IN_THIS_BUILD)
  }
})

test('この版が知らない方式が届いても、語の代わりが返る', () => {
  const later = 'somethingTheApiAddedLater' as string

  assert.equal(
    wordFor(SYSTEM_LABEL, later as ScanSystem),
    NOT_YET_IN_THIS_BUILD,
  )
})
