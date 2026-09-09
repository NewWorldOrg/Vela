import { test } from 'node:test'
import assert from 'node:assert/strict'

import { capabilityLabel } from '@/repository/driver-capabilities'
import { SESSION_PURPOSE_LABEL } from '@/repository/driver-capabilities'
import { NOT_YET_IN_THIS_BUILD, wordFor } from '@/lib/not-yet-in-this-build'

test('a capability is named the way the screen that uses it names it', () => {
  assert.equal(capabilityLabel('recording'), '録画')
  assert.equal(capabilityLabel('descrambling'), 'スクランブル解除')
  assert.equal(capabilityLabel('dropPositions'), 'ドロップ発生位置')
})

test('a dotted capability reads as the parent carrying the member', () => {
  assert.equal(capabilityLabel('signalQuality.cnr'), '信号品質 / CNR')
  assert.equal(
    capabilityLabel('signalQuality.postViterbiBitError'),
    '信号品質 / post-Viterbi ビット誤り率',
  )
  assert.equal(
    capabilityLabel('sessionPurpose.surveyNow'),
    'セッションの目的 / EPG 収集（前倒し）',
  )
})

test('a name the app has no word for is shown as it arrived', () => {
  assert.equal(capabilityLabel('somethingNewEntirely'), 'somethingNewEntirely')
  assert.equal(capabilityLabel('signalQuality.snr'), '信号品質 / snr')
  assert.equal(capabilityLabel('unknownParent.child'), 'unknownParent.child')
  assert.equal(capabilityLabel('signalQuality.'), 'signalQuality.')
  assert.equal(capabilityLabel('.orphan'), '.orphan')
})

test('この版が知らないセッションの目的が届いても、語の代わりが返る', () => {
  const later = 'somethingTheApiAddedLater' as string

  assert.equal(
    wordFor(SESSION_PURPOSE_LABEL, later as keyof typeof SESSION_PURPOSE_LABEL),
    NOT_YET_IN_THIS_BUILD,
  )
})
