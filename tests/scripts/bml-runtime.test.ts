import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { BUNDLE, bundled } from '@/scripts/bml-runtime.mjs'
import { RUNTIME_SCRIPT } from '@/components/data-broadcast/runtime-script.generated'

test('the committed runtime script is the runtime as it stands; yarn bml-runtime writes it again', () => {
  assert.equal(readFileSync(BUNDLE, 'utf8'), bundled())
})

test('the runtime script can be written into a script element as it is', () => {
  assert.equal(/<\/script/i.test(RUNTIME_SCRIPT), false)
  assert.ok(RUNTIME_SCRIPT.length > 0)
})
