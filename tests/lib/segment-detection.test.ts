import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { SegmentRound } from '@/repository/segment-status'
import {
  NO_ROUND_YET,
  ROUNDS_LEARNING_OFF,
  backToAutomaticRefusalOf,
  boundaryMatchOf,
  evidenceShortOf,
  lastRoundOf,
  nextRoundOf,
  recallOf,
  recallRowsOf,
  recordingsOf,
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
  recordings: 12,
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

test('the share that went back after a skip is said over the last seven days', () => {
  assert.equal(returnedAfterSkipOf(0.03), '3%(直近 7 日)')
  assert.equal(returnedAfterSkipOf(undefined), '対象なし')
})

test('recordings are counted in 本', () => {
  assert.equal(recordingsOf(12), '12 本')
  assert.equal(recordingsOf(0), '0 本')
})

test('a recall is a whole percent, and nothing when it was not measured', () => {
  assert.equal(recallOf(0.95), '95%')
  assert.equal(recallOf(undefined), '対象なし')
})

test('the CM recall is always a row, and OP and ED are rows only when the backend sends them', () => {
  assert.deepEqual(recallRowsOf([{ kind: 'break', recall: 0.95 }]), [
    { name: 'CM の再現率', value: '95%' },
  ])
  assert.deepEqual(recallRowsOf(undefined), [
    { name: 'CM の再現率', value: '対象なし' },
  ])
  assert.deepEqual(
    recallRowsOf([
      { kind: 'break', recall: 0.95 },
      { kind: 'opening', recall: 0.9 },
      { kind: 'ending' },
    ]),
    [
      { name: 'CM の再現率', value: '95%' },
      { name: 'OP の再現率', value: '90%' },
      { name: 'ED の再現率', value: '対象なし' },
    ],
  )
  assert.deepEqual(recallRowsOf([{ kind: 'opening', recall: 0.9 }]), [
    { name: 'CM の再現率', value: '対象なし' },
    { name: 'OP の再現率', value: '90%' },
  ])
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
      recordings: 4,
      boundaries: 120,
      enough: false,
    }),
    '答え合わせできる録画 4 / 10 本',
  )
  assert.equal(
    evidenceShortOf({ ...EVIDENCE, boundaries: 84, enough: false }),
    'CM の境目 84 / 100 か所',
  )
  assert.equal(
    evidenceShortOf({
      ...EVIDENCE,
      recordings: 4,
      boundaries: 37,
      enough: false,
    }),
    '答え合わせできる録画 4 / 10 本・CM の境目 37 / 100 か所',
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

const LEARNED: SegmentRound = {
  takenAt: '10月20日 3:06',
  outcome: 'kept',
  candidate: 5,
  verdict: 'tooLittleEvidence',
  inUse: { boundaryRecallWithin2s: 0.08, breakRecall: 0.4 },
  evidence: { ...EVIDENCE, boundaries: 56, enough: false },
  metrics: { boundaryRecallWithin2s: 0.11, breakRecall: 0.42 },
}

const LEAD = '直近の回(10月20日 3:06): '

test('the next round is said by the hour it may begin, or as the next free time once that has come, and learning off says nothing switches', () => {
  assert.equal(
    ROUNDS_LEARNING_OFF,
    '学習が無効のため、候補の版は作られず切り替わりません。',
  )
  assert.equal(nextRoundOf(undefined), '次の回: 次の空き時間。')
  assert.equal(
    nextRoundOf('10月21日 3時'),
    '次の回: 10月21日 3時以降の空き時間。',
  )
})

test('before any round there is none to tell', () => {
  assert.equal(lastRoundOf(undefined), NO_ROUND_YET)
  assert.equal(NO_ROUND_YET, 'まだ学習の回はありません。')
})

test('a round that made no candidate says why', () => {
  assert.equal(
    lastRoundOf({ takenAt: '10月20日 3:06', outcome: 'nothingNew' }),
    `${LEAD}新しいデータが無く、候補を作りませんでした。`,
  )
  assert.equal(
    lastRoundOf({ takenAt: '10月20日 3:06', outcome: 'nothingToLearnFrom' }),
    `${LEAD}学習に使えるデータが無く、候補を作りませんでした。`,
  )
  assert.equal(
    lastRoundOf({ takenAt: '10月20日 3:06', outcome: 'failed' }),
    `${LEAD}途中で失敗しました。次の日の回でやり直します。`,
  )
})

test('a candidate kept on too little evidence says its figures beside the version in use, and what fell short', () => {
  assert.equal(
    lastRoundOf(LEARNED),
    `${LEAD}候補の第 5 版を作りました。境目の一致は 11%(使用中の版は 8%)。答え合わせが録画 12 本・境目 56 か所で 100 か所に足りないため、切り替えていません。`,
  )
  assert.equal(
    lastRoundOf({
      ...LEARNED,
      evidence: { ...EVIDENCE, recordings: 4, boundaries: 37, enough: false },
    }),
    `${LEAD}候補の第 5 版を作りました。境目の一致は 11%(使用中の版は 8%)。答え合わせが録画 4 本・境目 37 か所で 10 本・100 か所に足りないため、切り替えていません。`,
  )
  assert.equal(
    lastRoundOf({ ...LEARNED, inUse: undefined, evidence: EVIDENCE }),
    `${LEAD}候補の第 5 版を作りました。境目の一致は 11%。使用中の版の答え合わせがまだ無いため、切り替えていません。`,
  )
  assert.equal(
    lastRoundOf({
      ...LEARNED,
      metrics: undefined,
      evidence: { ...EVIDENCE, recordings: 0, boundaries: 0, enough: false },
    }),
    `${LEAD}候補の第 5 版を作りました。答え合わせが録画 0 本・境目 0 か所で 10 本・100 か所に足りないため、切り替えていません。`,
  )
})

test('a candidate kept for finding no more boundaries says both figures', () => {
  assert.equal(
    lastRoundOf({
      ...LEARNED,
      verdict: 'noBetterAtBoundaries',
      inUse: { boundaryRecallWithin2s: 0.14 },
    }),
    `${LEAD}候補の第 5 版を作りました。境目の一致は 11%で、使用中の版の 14%を上回らなかったため切り替えていません。`,
  )
})

test('a candidate put in use says how far the boundary match rose, and the seconds of adverts when the boundaries tie', () => {
  const adopted: SegmentRound = {
    ...LEARNED,
    outcome: 'adopted',
    verdict: 'adopted',
    evidence: EVIDENCE,
  }

  assert.equal(
    lastRoundOf(adopted),
    `${LEAD}候補の第 5 版を作り、境目の一致が 8%から 11%に上がったため切り替えました。`,
  )
  assert.equal(
    lastRoundOf({
      ...adopted,
      inUse: { boundaryRecallWithin2s: 0.11, breakRecall: 0.4 },
    }),
    `${LEAD}候補の第 5 版を作り、境目の一致は同じ 11%で、CM の再現率が 40%から 42%に上がったため切り替えました。`,
  )
  assert.equal(
    lastRoundOf({
      ...adopted,
      inUse: { boundaryRecallWithin2s: 0.109, breakRecall: 0.4 },
    }),
    `${LEAD}候補の第 5 版を作り、境目の一致が使用中の版の 11%をわずかに上回ったため切り替えました。`,
  )
})

test('a candidate held out says why it did not switch', () => {
  assert.equal(
    lastRoundOf({
      ...LEARNED,
      outcome: 'heldAfterRollback',
      verdict: 'heldAfterRollback',
    }),
    `${LEAD}候補の第 5 版を作りましたが、戻した直後の 7 日間は切り替えません。`,
  )
  assert.equal(
    lastRoundOf({ ...LEARNED, verdict: 'chosenByHand' }),
    `${LEAD}候補の第 5 版を作りました。手動で選択した版を使っているため、切り替えていません。`,
  )
  assert.equal(
    lastRoundOf({
      ...LEARNED,
      outcome: 'inUseChangedMeanwhile',
      verdict: 'adopted',
    }),
    `${LEAD}候補の第 5 版を作りましたが、学習中に使用中の版が替わったため切り替えていません。`,
  )
})

test('a round this build does not know says so', () => {
  assert.equal(
    lastRoundOf({ takenAt: '10月20日 3:06', outcome: 'stopped' }),
    `${LEAD}この版がまだ知らない値です。`,
  )
})
