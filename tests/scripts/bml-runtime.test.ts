import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import {
  BUNDLE,
  RECEIVER_BUNDLE,
  bundled,
  receiverBundled,
} from '@/scripts/bml-runtime.mjs'
import { RUNTIME_SCRIPT } from '@/components/data-broadcast/runtime-script.generated'
import { runtimeDocument } from '@/lib/bml/runtime-document'
import { HYBRIDCAST_RECEIVER_SCRIPT } from '@/components/data-broadcast/line-relay'

test('the committed runtime script is the runtime as it stands; yarn bml-runtime writes it again', () => {
  assert.equal(readFileSync(BUNDLE, 'utf8'), bundled())
})

test('the runtime script can be written into a script element as it is: it never ends the element, opens another or starts an HTML comment', () => {
  assert.equal(/<\/script/i.test(RUNTIME_SCRIPT), false)
  assert.equal(/<script/i.test(RUNTIME_SCRIPT), false)
  assert.equal(RUNTIME_SCRIPT.includes('<!--'), false)
  assert.ok(RUNTIME_SCRIPT.length > 0)
  assert.doesNotThrow(() =>
    runtimeDocument('https://vela.example', RUNTIME_SCRIPT),
  )
})

test('the committed Hybridcast receiver is the receiver as it stands; yarn bml-runtime writes it again', () => {
  assert.equal(readFileSync(RECEIVER_BUNDLE, 'utf8'), receiverBundled())
})

test('the Hybridcast receiver is served from where the relay is told it is', () => {
  assert.ok(RECEIVER_BUNDLE.endsWith(`public${HYBRIDCAST_RECEIVER_SCRIPT}`))
})
