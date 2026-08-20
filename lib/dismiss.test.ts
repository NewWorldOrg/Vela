import assert from 'node:assert/strict'
import { test } from 'node:test'

import { escapeDismisses, opensSurface, pressDismisses } from './dismiss.ts'
import type { DismissTarget } from './dismiss.ts'

/** A stand-in for a pressed element that answers to the selectors it is given. */
function pressed(...matches: string[]): DismissTarget {
  const target: DismissTarget = {
    closest: (selectors: string) =>
      matches.includes(selectors) ? target : null,
  }

  return target
}

test('the opener selector names the surface a control opens', () => {
  assert.equal(opensSurface('collection'), '[data-opens="collection"]')
})

test('a press outside the surface dismisses it', () => {
  assert.equal(
    pressDismisses({ pressed: pressed(), inside: false, covered: false }),
    true,
  )
})

test('a press inside the surface leaves it open', () => {
  assert.equal(
    pressDismisses({ pressed: pressed(), inside: true, covered: false }),
    false,
  )
})

test('a press on a control that opens the surface leaves it open', () => {
  assert.equal(
    pressDismisses({
      pressed: pressed('[data-opens="collection"]'),
      inside: false,
      opener: 'collection',
      covered: false,
    }),
    false,
  )
})

test('a press on a control that opens another surface dismisses this one', () => {
  assert.equal(
    pressDismisses({
      pressed: pressed('[data-opens="program-panel"]'),
      inside: false,
      opener: 'collection',
      covered: false,
    }),
    true,
  )
})

test('a press claimed by the layer above leaves the surface open', () => {
  assert.equal(
    pressDismisses({ pressed: pressed(), inside: false, covered: true }),
    false,
  )
})

test('a press on nothing leaves the surface open', () => {
  assert.equal(
    pressDismisses({ pressed: null, inside: false, covered: false }),
    false,
  )
})

test('escape dismisses the surface', () => {
  assert.equal(escapeDismisses({ covered: false }), true)
})

test('escape claimed by the layer above leaves the surface open', () => {
  assert.equal(escapeDismisses({ covered: true }), false)
})
