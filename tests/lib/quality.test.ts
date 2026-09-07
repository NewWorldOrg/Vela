import assert from 'node:assert/strict'
import { test } from 'node:test'

import { thresholdProblem } from '@/lib/quality'

test('空欄と数でないものは、送る前に断る', () => {
  assert.equal(thresholdProblem('', 0, 100, '%'), '数値を入力してください')
  assert.equal(thresholdProblem('  ', 0, 100, '%'), '数値を入力してください')
  assert.equal(
    thresholdProblem('たくさん', 0, 100, '%'),
    '数値を入力してください',
  )
})

test('範囲の外は、その範囲を言って断る', () => {
  assert.equal(
    thresholdProblem('101', 0, 100, '%'),
    '0 〜 100% の範囲で入力してください',
  )
  assert.equal(
    thresholdProblem('-1', 0, 100, '%'),
    '0 〜 100% の範囲で入力してください',
  )
})

test('端も範囲の内', () => {
  assert.equal(thresholdProblem('0', 0, 100, '%'), undefined)
  assert.equal(thresholdProblem('100', 0, 100, '%'), undefined)
  assert.equal(thresholdProblem('0.0001', 0, 1, ''), undefined)
})
