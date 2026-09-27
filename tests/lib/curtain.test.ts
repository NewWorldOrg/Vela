import assert from 'node:assert/strict'
import { test } from 'node:test'

import { CURTAIN_ASKING, CURTAIN_FORGETTING, curtainAsked } from '@/lib/curtain'

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
