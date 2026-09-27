import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  FOLD_SPELLING,
  cookieIn,
  flagOf,
  forgettingCookie,
  storingCookie,
} from '@/lib/stored-flag'

test('a flag is on only when the cookie says the word for yes', () => {
  assert.equal(flagOf('folded', FOLD_SPELLING), true)
  assert.equal(flagOf('open', FOLD_SPELLING), false)
  assert.equal(flagOf(undefined, FOLD_SPELLING), false)
  assert.equal(flagOf('Folded', FOLD_SPELLING), false)
})

test('the browser reads back the cookie the server reads', () => {
  const jar = 'vela-theme-mode=dark; vela-live-channels-folded=folded; x=1'

  assert.equal(cookieIn(jar, 'vela-live-channels-folded'), 'folded')
  assert.equal(cookieIn(jar, 'vela-theme-mode'), 'dark')
  assert.equal(cookieIn(jar, 'vela-live-sub-channels-folded'), undefined)
  assert.equal(cookieIn('', 'vela-live-channels-folded'), undefined)
  assert.equal(
    cookieIn('avela-live-channels-folded=folded', 'vela-live-channels-folded'),
    undefined,
  )
})

test('a flag is kept for every page and for a year, and forgetting it drops it', () => {
  assert.equal(
    storingCookie('vela-live-channels-folded', 'folded'),
    'vela-live-channels-folded=folded;path=/;max-age=31536000;SameSite=Lax',
  )
  assert.equal(
    forgettingCookie('vela-live-channels-folded'),
    'vela-live-channels-folded=;path=/;max-age=0;SameSite=Lax',
  )
})
