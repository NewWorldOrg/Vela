import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  isChanged,
  shownInForm,
  thresholdFormProblems,
  thresholdProblem,
  thresholdWrites,
} from '@/lib/quality'
import type {
  QualityThreshold,
  QualityThresholdKey,
} from '@/repository/quality'

test('空欄と数でないものは、送る前に断る', () => {
  assert.equal(thresholdProblem('', 0, 100, '%'), '数値を入力してください。')
  assert.equal(thresholdProblem('  ', 0, 100, '%'), '数値を入力してください。')
  assert.equal(
    thresholdProblem('たくさん', 0, 100, '%'),
    '数値を入力してください。',
  )
})

test('範囲の外は、その範囲を言って断る', () => {
  assert.equal(thresholdProblem('101', 0, 100, '%'), '値は 0 〜 100% です。')
  assert.equal(thresholdProblem('-1', 0, 100, '%'), '値は 0 〜 100% です。')
})

test('端も範囲の内', () => {
  assert.equal(thresholdProblem('0', 0, 100, '%'), undefined)
  assert.equal(thresholdProblem('100', 0, 100, '%'), undefined)
  assert.equal(thresholdProblem('0.0001', 0, 1, ''), undefined)
})

const drop = (
  key: QualityThresholdKey,
  label: string,
  amount: string,
  more: Partial<QualityThreshold> = {},
): QualityThreshold => ({
  key,
  label,
  value: `${amount}%`,
  source: 'shipped',
  shipped: `${amount}%`,
  amount,
  unit: '%',
  lowest: 0,
  highest: 100,
  ...more,
})

const WARNING = drop('packetsLostWarning', 'ドロップ率の警告水準', '0.02', {
  atMost: 'packetsLostUnwatchable',
})

const UNWATCHABLE = drop(
  'packetsLostUnwatchable',
  'ドロップ率の視聴不可の恐れ',
  '0.1',
)

const LOCK = drop('lockRate', 'lock 率の下限', '99', {
  source: 'byHand',
  releasedAmount: '97.5',
})

const ROWS = [WARNING, UNWATCHABLE, LOCK]

test('欄に出す値は、打った値、解除の戻り先、今の値の順に取る', () => {
  assert.equal(shownInForm(LOCK, undefined), '99')
  assert.equal(shownInForm(LOCK, { kind: 'typed', text: '95' }), '95')
  assert.equal(shownInForm(LOCK, { kind: 'released' }), '97.5')
})

test('今と同じ値を打ち直した行は、変えた行に数えない', () => {
  assert.equal(isChanged(WARNING, undefined), false)
  assert.equal(isChanged(WARNING, { kind: 'typed', text: '0.02' }), false)
  assert.equal(isChanged(WARNING, { kind: 'typed', text: ' 0.020 ' }), false)
  assert.equal(isChanged(WARNING, { kind: 'typed', text: '0.03' }), true)
  assert.equal(isChanged(WARNING, { kind: 'typed', text: '' }), true)
  assert.equal(isChanged(LOCK, { kind: 'released' }), true)
})

test('変えた行の数と範囲を、行ごとに検める', () => {
  assert.deepEqual(
    thresholdFormProblems(ROWS, {
      lockRate: { kind: 'typed', text: '101' },
      packetsLostUnwatchable: { kind: 'typed', text: 'たくさん' },
    }),
    {
      lockRate: '値は 0 〜 100% です。',
      packetsLostUnwatchable: '数値を入力してください。',
    },
  )
  assert.deepEqual(thresholdFormProblems(ROWS, {}), {})
})

test('警告水準が視聴不可の恐れを越えるときは、変えた側の行に相手の値を添えて言う', () => {
  assert.deepEqual(
    thresholdFormProblems(ROWS, {
      packetsLostWarning: { kind: 'typed', text: '0.5' },
    }),
    {
      packetsLostWarning: '値は ドロップ率の視聴不可の恐れ(0.1%)以下です。',
    },
  )
  assert.deepEqual(
    thresholdFormProblems(ROWS, {
      packetsLostUnwatchable: { kind: 'typed', text: '0.01' },
    }),
    {
      packetsLostUnwatchable: '値は ドロップ率の警告水準(0.02%)以上です。',
    },
  )
  assert.deepEqual(
    thresholdFormProblems(ROWS, {
      packetsLostWarning: { kind: 'typed', text: '0.3' },
      packetsLostUnwatchable: { kind: 'typed', text: '0.2' },
    }),
    {
      packetsLostWarning: '値は ドロップ率の視聴不可の恐れ(0.2%)以下です。',
      packetsLostUnwatchable: '値は ドロップ率の警告水準(0.3%)以上です。',
    },
  )
})

test('警告水準と視聴不可の恐れは、同じ値までなら順序が崩れていない', () => {
  assert.deepEqual(
    thresholdFormProblems(ROWS, {
      packetsLostWarning: { kind: 'typed', text: '0.1' },
    }),
    {},
  )
})

test('範囲の誤りがある対は、順序より範囲の誤りを言う', () => {
  assert.deepEqual(
    thresholdFormProblems(ROWS, {
      packetsLostWarning: { kind: 'typed', text: '0.5' },
      packetsLostUnwatchable: { kind: 'typed', text: '101' },
    }),
    { packetsLostUnwatchable: '値は 0 〜 100% です。' },
  )
})

test('解除する行は、戻り先の値で順序を検める', () => {
  const byHand = {
    ...WARNING,
    amount: '0.05',
    source: 'byHand' as const,
    releasedAmount: '0.2',
  }

  assert.deepEqual(
    thresholdFormProblems([byHand, UNWATCHABLE], {
      packetsLostWarning: { kind: 'released' },
    }),
    {
      packetsLostWarning: '値は ドロップ率の視聴不可の恐れ(0.1%)以下です。',
    },
  )
})

test('送るのは変えた行だけで、画面の単位の数にして渡す', () => {
  assert.deepEqual(
    thresholdWrites(ROWS, {
      packetsLostWarning: { kind: 'typed', text: '0.02' },
      packetsLostUnwatchable: { kind: 'typed', text: ' 0.2 ' },
      lockRate: { kind: 'released' },
    }),
    [
      { kind: 'revise', key: 'packetsLostUnwatchable', amount: 0.2 },
      { kind: 'release', key: 'lockRate' },
    ],
  )
})

test('対の両方を上げて警告水準が今の視聴不可の恐れを越えるときは、視聴不可の恐れから送る', () => {
  assert.deepEqual(
    thresholdWrites(ROWS, {
      packetsLostWarning: { kind: 'typed', text: '0.5' },
      packetsLostUnwatchable: { kind: 'typed', text: '1' },
      lockRate: { kind: 'typed', text: '95' },
    }),
    [
      { kind: 'revise', key: 'packetsLostUnwatchable', amount: 1 },
      { kind: 'revise', key: 'packetsLostWarning', amount: 0.5 },
      { kind: 'revise', key: 'lockRate', amount: 95 },
    ],
  )
})

test('対の両方を下げるときは、警告水準から送る', () => {
  assert.deepEqual(
    thresholdWrites(ROWS, {
      packetsLostWarning: { kind: 'typed', text: '0.01' },
      packetsLostUnwatchable: { kind: 'typed', text: '0.015' },
    }),
    [
      { kind: 'revise', key: 'packetsLostWarning', amount: 0.01 },
      { kind: 'revise', key: 'packetsLostUnwatchable', amount: 0.015 },
    ],
  )
})
