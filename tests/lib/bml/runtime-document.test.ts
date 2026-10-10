import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  PLANE_ID,
  PLAYER_ORIGIN_META,
  RUNTIME_POLICY,
  RUNTIME_SANDBOX,
  runtimeDocument,
} from '@/lib/bml/runtime-document'
import { BASE_STYLE } from '@/lib/bml/style'

test('the frame lets scripts run and nothing else: no same origin, no forms, no popups, no navigating the player', () => {
  assert.equal(RUNTIME_SANDBOX, 'allow-scripts')
})

test('the document has no network and takes only what it is handed', () => {
  assert.equal(
    RUNTIME_POLICY,
    "default-src 'none'; script-src 'unsafe-inline' blob:; img-src blob:; style-src 'unsafe-inline'; connect-src 'none'",
  )
})

test('the document carries its policy, the origin it listens to, its base style, its plane and its script', () => {
  const source = runtimeDocument('https://vela.example', 'start()')

  assert.ok(source.startsWith('<!doctype html>'))
  assert.ok(
    source.includes(
      `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' blob:; img-src blob:; style-src 'unsafe-inline'; connect-src 'none'">`,
    ),
  )
  assert.ok(
    source.includes(
      `<meta name="${PLAYER_ORIGIN_META}" content="https://vela.example">`,
    ),
  )
  assert.ok(source.includes(`<style>${BASE_STYLE}</style>`))
  assert.ok(
    source.includes(`<div id="${PLANE_ID}"></div><script>start()</script>`),
  )
  assert.ok(
    source.indexOf('Content-Security-Policy') < source.indexOf('<script>'),
    'the policy is in force before any script',
  )
})

test('the origin cannot close the attribute it is written into', () => {
  const source = runtimeDocument('"><script>bad()</script>', 'start()')

  assert.ok(
    source.includes('content="&quot;&gt;&lt;script&gt;bad()&lt;/script&gt;"'),
  )
  assert.equal(source.match(/<script/gi)?.length, 1)
})

test('a script that could end its element, open another or start an HTML comment inside it is refused', () => {
  for (const script of [
    'a = "</script>"',
    'a = "</SCRIPT "',
    'a = "<script>"',
    'a = "<!--"',
  ]) {
    assert.throws(() => runtimeDocument('https://vela.example', script), script)
  }
})
