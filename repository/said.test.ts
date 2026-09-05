import assert from 'node:assert/strict'
import { test } from 'node:test'

import { whatItSaid } from './said.ts'

const REFUSED = {
  status: false,
  message: 'Recording x was already encoded with profile p by job y.',
  data: null,
}

test('a refusal is read from the half of the answer it arrives in', () => {
  assert.equal(whatItSaid(REFUSED, undefined), REFUSED.message)
})

test('an answer that came through is read from the half it arrives in', () => {
  assert.equal(whatItSaid(undefined, REFUSED), REFUSED.message)
})

test('a body that says nothing is read as nothing', () => {
  assert.equal(whatItSaid(undefined, undefined), undefined)
  assert.equal(whatItSaid({ status: false, data: null }), undefined)
  assert.equal(
    whatItSaid({ status: false, message: '', data: null }),
    undefined,
  )
})

test('a body that is not an envelope is read as nothing', () => {
  assert.equal(whatItSaid('<html>502 Bad Gateway</html>'), undefined)
  assert.equal(whatItSaid(null), undefined)
  assert.equal(whatItSaid({ message: 404 }), undefined)
})
