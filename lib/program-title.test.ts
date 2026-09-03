import assert from 'node:assert/strict'
import { test } from 'node:test'

import { mainTitleOf, saysSubtitled } from './program-title.ts'

test('the subtitle mark in a name is read wherever the broadcaster put it', () => {
  assert.equal(saysSubtitled('時論公論　【出演】NHK解説委員\u{1F211}'), true)
  assert.equal(
    saysSubtitled('突破ファイル\u{1F211}空港税関VS悪徳ゲーマー密輸▼'),
    true,
  )
  assert.equal(saysSubtitled('\u{1F211}アニメ　アオアシ(22)'), true)
})

test('a name carrying no subtitle mark does not say it is subtitled', () => {
  assert.equal(saysSubtitled('ニュースウオッチ9'), false)
  assert.equal(saysSubtitled(''), false)
})

test('another broadcast mark is not the subtitle one', () => {
  // 再 U+1F21E, デ U+1F213, 解 U+1F216, 二 U+1F214 — all marks, none of them 字.
  assert.equal(
    saysSubtitled('ドラマ\u{1F21E}\u{1F213}\u{1F216}\u{1F214}'),
    false,
  )
})

test('a mark is a boundary of the main title, not part of it', () => {
  assert.equal(
    mainTitleOf('ドラマスペシャル\u{1F211}第1話'),
    'ドラマスペシャル',
  )
  assert.equal(
    mainTitleOf('時論公論　【出演】NHK解説委員\u{1F211}'),
    '時論公論',
  )
})
