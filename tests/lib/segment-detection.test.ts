import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  backToAutomaticRefusalOf,
  boundaryMatchOf,
  evidenceShortOf,
  extraBoundariesOf,
  programmeSkippedOf,
  repeatedSoundsOf,
  returnedAfterSkipOf,
  shareOf,
  skipThresholdProblem,
  skipThresholdRefusalOf,
  skipThresholdToSend,
  switchRefusalOf,
  thresholdOf,
  versionLabel,
} from '@/lib/segment-detection'

const EVIDENCE = {
  confirmedRecordings: 12,
  boundaries: 148,
  enough: true,
  recordingsNeeded: 10,
  boundariesNeeded: 100,
}

test('a version is named by its number', () => {
  assert.equal(versionLabel(3), '第 3 版')
})

test('a share is a whole percent with nothing between the number and the sign', () => {
  assert.equal(shareOf(0.93), '93%')
  assert.equal(shareOf(0.035), '4%')
  assert.equal(shareOf(1), '100%')
})

test('the boundary match says each window it has, and nothing when it has none', () => {
  assert.equal(boundaryMatchOf(0.93, 0.85), '±2 秒 93%・±1 秒 85%')
  assert.equal(boundaryMatchOf(0.93), '±2 秒 93%')
  assert.equal(boundaryMatchOf(undefined, 0.85), '±1 秒 85%')
  assert.equal(boundaryMatchOf(undefined), '対象なし')
})

test('the rates are said per recording and per hour to one place', () => {
  assert.equal(extraBoundariesOf(1.2), '1 件あたり 1.2')
  assert.equal(extraBoundariesOf(2), '1 件あたり 2.0')
  assert.equal(programmeSkippedOf(2.14), '1 時間あたり 2.1 秒')
  assert.equal(returnedAfterSkipOf(0.03), '3%(直近 7 日)')
  assert.equal(returnedAfterSkipOf(undefined), '対象なし')
})

test('the threshold is said to two places', () => {
  assert.equal(thresholdOf(0.7), '0.70')
  assert.equal(thresholdOf(0.65), '0.65')
})

test('enough evidence says nothing, and too little says what is short of what', () => {
  assert.equal(evidenceShortOf(EVIDENCE), undefined)
  assert.equal(
    evidenceShortOf({
      ...EVIDENCE,
      confirmedRecordings: 4,
      boundaries: 120,
      enough: false,
    }),
    '確かめた録画 4 / 10 件',
  )
  assert.equal(
    evidenceShortOf({ ...EVIDENCE, boundaries: 84, enough: false }),
    'CM の境目 84 / 100 か所',
  )
  assert.equal(
    evidenceShortOf({
      ...EVIDENCE,
      confirmedRecordings: 4,
      boundaries: 37,
      enough: false,
    }),
    '確かめた録画 4 / 10 件・CM の境目 37 / 100 か所',
  )
})

test('the repeated sounds name CM and the programme fixed parts', () => {
  assert.equal(
    repeatedSoundsOf({ cm: 820, programmeFixture: 40 }),
    'CM 820・番組の決まった部分 40',
  )
})

test('a threshold is a number from 0.50 to 0.95', () => {
  assert.equal(skipThresholdProblem('0.70'), undefined)
  assert.equal(skipThresholdProblem(' 0.5 '), undefined)
  assert.equal(skipThresholdProblem('0.95'), undefined)
  assert.equal(skipThresholdProblem('0.49'), '閾値は 0.50 〜 0.95 です。')
  assert.equal(skipThresholdProblem('0.96'), '閾値は 0.50 〜 0.95 です。')
  assert.equal(skipThresholdProblem(''), '数値を入力してください。')
  assert.equal(skipThresholdProblem('あ'), '数値を入力してください。')
})

test('a threshold is sent to the hundredth', () => {
  assert.equal(skipThresholdToSend('0.62'), 0.62)
  assert.equal(skipThresholdToSend(' 0.657 '), 0.66)
  assert.equal(skipThresholdToSend('.7'), 0.7)
})

test('each refusal says why it could not be done', () => {
  assert.equal(
    switchRefusalOf('learningOff'),
    '学習が無効のため、切り替えできませんでした。',
  )
  assert.equal(
    switchRefusalOf('unauthenticated'),
    'サインインが切れているため、切り替えできませんでした。',
  )
  assert.equal(
    switchRefusalOf('notSaved'),
    '切り替えできませんでした。時間をおいてからもう一度お試しください。',
  )
  assert.equal(
    backToAutomaticRefusalOf('learningOff'),
    '学習が無効のため、変更できませんでした。',
  )
  assert.equal(
    skipThresholdRefusalOf('outOfRange'),
    '閾値は 0.50 〜 0.95 です。',
  )
  assert.equal(
    skipThresholdRefusalOf('unauthenticated'),
    'サインインが切れているため、保存できませんでした。',
  )
  assert.equal(
    skipThresholdRefusalOf('notSaved'),
    '保存できませんでした。時間をおいてからもう一度お試しください。',
  )
})
