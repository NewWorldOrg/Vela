import assert from 'node:assert/strict'
import { test } from 'node:test'

import { cn } from '@/lib/utils'

test('a v4 type step and a colour of words are both kept', () => {
  for (const step of ['display', 'display-s', 'section', 'heading', 'ui']) {
    assert.equal(
      cn(`text-${step}`, 'text-rec-text'),
      `text-${step} text-rec-text`,
    )
  }
})

test('the later of two type steps still wins', () => {
  assert.equal(cn('text-section', 'text-heading'), 'text-heading')
})
