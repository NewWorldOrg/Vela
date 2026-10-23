import assert from 'node:assert/strict'
import { test } from 'node:test'

import { FIRST_PREFECTURE, LAST_PREFECTURE } from '@/lib/bml/receiver-info'
import {
  NOT_REGISTERED,
  POSTAL_CODE_PROBLEM,
  PREFECTURES,
  postalCodeProblem,
  postalCodeShown,
  postalCodeToSend,
  postalCodeTyped,
  prefectureShown,
  residenceRefusalOf,
} from '@/lib/residence'

test('every place of the prefecture designation is offered once, the islands after their prefecture', () => {
  const values = PREFECTURES.map(({ value }) => value)

  assert.deepEqual(
    [...values].sort((a, b) => a - b),
    Array.from(
      { length: LAST_PREFECTURE - FIRST_PREFECTURE + 1 },
      (_, at) => FIRST_PREFECTURE + at,
    ),
  )
  assert.equal(values.indexOf(48), values.indexOf(13) + 1)
  assert.equal(values.indexOf(49), values.indexOf(46) + 1)
  assert.equal(new Set(PREFECTURES.map(({ label }) => label)).size, 50)
})

test('the prefectures are named in the order of their codes, Hokkaido split in two', () => {
  assert.equal(prefectureShown(0), '東北海道')
  assert.equal(prefectureShown(1), '西北海道')
  assert.equal(prefectureShown(2), '青森県')
  assert.equal(prefectureShown(13), '東京都(島部を除く)')
  assert.equal(prefectureShown(26), '京都府')
  assert.equal(prefectureShown(47), '沖縄県')
  assert.equal(prefectureShown(48), '東京都島部(伊豆・小笠原諸島)')
  assert.equal(prefectureShown(49), '鹿児島県島部(南西諸島の鹿児島県域)')
  assert.equal(prefectureShown(null), NOT_REGISTERED)
})

test('a postal code is shown with its hyphen, and none as not registered', () => {
  assert.equal(postalCodeShown('0000000'), '000-0000')
  assert.equal(postalCodeShown(null), NOT_REGISTERED)
  assert.equal(postalCodeTyped('0000000'), '000-0000')
  assert.equal(postalCodeTyped(null), '')
})

test('a postal code is typed with or without its hyphen, in either width, and empty is none', () => {
  for (const [typed, sent] of [
    ['0000000', '0000000'],
    ['000-0000', '0000000'],
    [' 000-0000 ', '0000000'],
    ['〒000-0000', '0000000'],
    ['０００－００００', '0000000'],
    ['', null],
    ['   ', null],
  ] as const) {
    assert.equal(postalCodeProblem(typed), undefined, typed)
    assert.equal(postalCodeToSend(typed), sent, typed)
  }
})

test('anything else typed is said to be seven digits', () => {
  for (const typed of [
    '000000',
    '00000000',
    '0000-000',
    '00-00000',
    '000 0000',
    'abc-defg',
    '000--0000',
  ]) {
    assert.equal(postalCodeProblem(typed), POSTAL_CODE_PROBLEM, typed)
  }
})

test('a refusal says what to fix, that the session ended, or that it could not be saved', () => {
  assert.equal(residenceRefusalOf('invalid'), POSTAL_CODE_PROBLEM)
  assert.equal(
    residenceRefusalOf('unauthenticated'),
    'サインインが切れているため、保存できませんでした。',
  )
  assert.equal(
    residenceRefusalOf('notSaved'),
    '保存できませんでした。時間をおいてからもう一度お試しください。',
  )
})
