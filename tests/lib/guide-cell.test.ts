import assert from 'node:assert/strict'
import { test } from 'node:test'

import { genreWordOf, halfWidthOf } from '@/lib/guide-cell'

test('full-width letters, digits and signs are drawn half-width', () => {
  assert.equal(halfWidthOf('ＮＨＫニュース７'), 'NHKニュース7')
  assert.equal(halfWidthOf('第３５話「ａ！？」'), '第35話「a!?」')
  assert.equal(halfWidthOf('（字）\u3000＃１５～'), '(字) #15~')
})

test('every sign from the full-width exclamation to the full-width tilde is drawn half-width', () => {
  for (let code = 0xff01; code <= 0xff5e; code += 1) {
    assert.equal(
      halfWidthOf(String.fromCharCode(code)),
      String.fromCharCode(code - 0xfee0),
    )
  }
})

test('broadcast marks, kana and kanji are left as they are', () => {
  assert.equal(halfWidthOf('🈑🈞🈖🈀'), '🈑🈞🈖🈀')
  assert.equal(halfWidthOf('アニメ・ドラマ「再」'), 'アニメ・ドラマ「再」')
  assert.equal(halfWidthOf('ｱｲｳ'), 'ｱｲｳ')
  assert.equal(halfWidthOf('Ⅲ'), 'Ⅲ')
})

test('a genre is named in the cell by the word before its slash', () => {
  assert.equal(genreWordOf('情報/ワイドショー'), '情報')
  assert.equal(genreWordOf('アニメ/特撮'), 'アニメ')
  assert.equal(genreWordOf('スポーツ'), 'スポーツ')
})
