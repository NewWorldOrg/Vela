import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  castInExtended,
  extendedBlocksOf,
  leadOfExtended,
} from '@/lib/programme-extended'

const EXTENDED = [
  '◇番組内容\n海辺の町の朝を追う',
  '◇出演者\n宇津木 千歳',
  'ゲスト\n真名瀬 湊',
  'ナレーター\n峰 あかり',
  'スタッフ\n演出 岬 早苗',
  '◇おしらせ\n再放送は翌週です',
].join('\n\n')

test('a heading and its body are read as one block', () => {
  assert.deepEqual(extendedBlocksOf('◇出演者\n宇津木 千歳'), [
    { heading: '◇出演者', text: '宇津木 千歳' },
  ])
})

test('a line standing on its own is not a block', () => {
  assert.deepEqual(extendedBlocksOf('この番組は再放送です'), [])
})

test('a body of several lines is read as one line', () => {
  assert.deepEqual(
    leadOfExtended('◇番組内容\n海辺の町の\n朝を追う'),
    '海辺の町の 朝を追う',
  )
})

test('nothing at all is no block and no lead', () => {
  assert.deepEqual(extendedBlocksOf(''), [])
  assert.equal(leadOfExtended(''), undefined)
})

test('the blocks that name people who appear are the cast', () => {
  assert.deepEqual(castInExtended(EXTENDED), [
    '宇津木 千歳',
    '真名瀬 湊',
    '峰 あかり',
  ])
})

test('the block the programme leads with is the lead', () => {
  assert.equal(leadOfExtended(EXTENDED), '海辺の町の朝を追う')
})

test('a programme that names nobody has no cast', () => {
  assert.deepEqual(castInExtended('スタッフ\n演出 岬 早苗'), [])
})

test('the words a heading uses for the cast are read wherever they sit', () => {
  assert.deepEqual(castInExtended('主な出演者2\n宇津木 千歳'), ['宇津木 千歳'])
  assert.deepEqual(castInExtended('◇声の出演\n峰 あかり'), ['峰 あかり'])
  assert.deepEqual(castInExtended('キャスト\n真名瀬 湊'), ['真名瀬 湊'])
})
