import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  CURTAIN_ASKING,
  CURTAIN_FORGETTING,
  CURTAIN_HOLD_MS,
  FOLDS_ON_A_SIDE,
  curtainAsked,
} from '@/lib/curtain'

test('only the word sign-in writes asks for the curtain', () => {
  assert.equal(curtainAsked('raise'), true)
  assert.equal(curtainAsked(undefined), false)
  assert.equal(curtainAsked(''), false)
  assert.equal(curtainAsked('Raise'), false)
})

test('the ask reaches every page and does not outlive a sign-in', () => {
  assert.match(CURTAIN_ASKING, /^vela-curtain=raise;/)
  assert.match(CURTAIN_ASKING, /;path=\/;/)
  assert.match(CURTAIN_ASKING, /;max-age=300;/)
  assert.match(CURTAIN_FORGETTING, /^vela-curtain=;path=\/;max-age=0;/)
})

test('the curtain waits closed no longer than its hold and has nine folds a side', () => {
  assert.equal(CURTAIN_HOLD_MS, 800)
  assert.equal(FOLDS_ON_A_SIDE, 9)
})
