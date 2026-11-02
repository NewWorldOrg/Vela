import assert from 'node:assert/strict'
import { test } from 'node:test'

import { CURTAIN_HOLD_MS, FOLDS_ON_A_SIDE } from '@/lib/curtain'

test('the curtain waits closed no longer than its hold and has nine folds a side', () => {
  assert.equal(CURTAIN_HOLD_MS, 800)
  assert.equal(FOLDS_ON_A_SIDE, 9)
})
