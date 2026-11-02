import assert from 'node:assert/strict'
import { test } from 'node:test'

import { themeAfterPress, themeOf } from '@/lib/theme'

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

test('a press that would land on the device theme goes back to following the system', () => {
  assert.equal(themeAfterPress('light', 'dark'), 'system')
  assert.equal(themeAfterPress('dark', 'light'), 'system')
})

test('a press away from the device theme keeps the other of light and dark', () => {
  assert.equal(themeAfterPress('dark', 'dark'), 'light')
  assert.equal(themeAfterPress('light', 'light'), 'dark')
})

test('two presses from following the system come back to it', () => {
  for (const device of ['light', 'dark'] as const) {
    const first = themeAfterPress(device, device)
    const shown = first === 'system' ? device : first

    assert.notEqual(first, 'system')
    assert.equal(themeAfterPress(shown, device), 'system')
  }
})
