import assert from 'node:assert/strict'
import { test } from 'node:test'

import { CURTAIN_HOLD_MS } from '@/lib/curtain'

test('the curtain waits closed no longer than its hold', () => {
  assert.equal(CURTAIN_HOLD_MS, 800)
})
