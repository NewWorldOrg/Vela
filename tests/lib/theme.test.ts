import assert from 'node:assert/strict'
import { test } from 'node:test'

import { themeOf } from '@/lib/theme'

test('a theme the cookie names is taken as it is', () => {
  assert.equal(themeOf('light'), 'light')
  assert.equal(themeOf('dark'), 'dark')
  assert.equal(themeOf('system'), 'system')
})

test('a missing or unknown theme follows the system', () => {
  assert.equal(themeOf(undefined), 'system')
  assert.equal(themeOf(null), 'system')
  assert.equal(themeOf(''), 'system')
  assert.equal(themeOf('Dark'), 'system')
})
