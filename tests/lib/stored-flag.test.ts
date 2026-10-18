import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  AUTO_OPEN_SPELLING,
  FOLD_SPELLING,
  SOUNDS_SPELLING,
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

test('the data broadcast opens by itself only when the cookie says so, and not until it is set', () => {
  assert.equal(flagOf('opens', AUTO_OPEN_SPELLING), true)
  assert.equal(flagOf('waits', AUTO_OPEN_SPELLING), false)
  assert.equal(flagOf(undefined, AUTO_OPEN_SPELLING), false)
})

test('a flag that starts on stays on until the cookie says the word for no, and a word for neither reads as off', () => {
  assert.equal(flagOf(undefined, SOUNDS_SPELLING, true), true)
  assert.equal(flagOf('plays', SOUNDS_SPELLING, true), true)
  assert.equal(flagOf('silent', SOUNDS_SPELLING, true), false)
  assert.equal(flagOf('Plays', SOUNDS_SPELLING, true), false)
  assert.equal(flagOf(undefined, SOUNDS_SPELLING, false), false)
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
