import assert from 'node:assert/strict'
import { test } from 'node:test'

import { NOT_YET_IN_THIS_BUILD, wordFor } from '@/lib/not-yet-in-this-build'
import type {
  Deinterlace,
  EncodeCodec,
  EncodeEncoder,
  EncodeFailure,
  EncodeJobStatus,
  EncodeRemoved,
  EncodeResolution,
  EncodeStanding,
  EncodeSwerve,
} from '@/repository/encode-terms'
import {
  CODEC_LABEL,
  DEINTERLACE_LABEL,
  ENCODER_LABEL,
  FAILURE_LABEL,
  REMOVAL_LABEL,
  RESOLUTION_LABEL,
  STANDING_LABEL,
  STATUS_LABEL,
  SWERVE_LABEL,
} from '@/repository/encode-terms'

const LATER = 'somethingTheApiAddedLater' as string

const EVERY_TABLE: [string, string][] = [
  ['ジョブの状態', wordFor(STATUS_LABEL, LATER as EncodeJobStatus)],
  [
    '録画ごとのエンコードの状態',
    wordFor(STANDING_LABEL, LATER as EncodeStanding),
  ],
  ['コーデック', wordFor(CODEC_LABEL, LATER as EncodeCodec)],
  ['解像度', wordFor(RESOLUTION_LABEL, LATER as EncodeResolution)],
  ['インターレース解除', wordFor(DEINTERLACE_LABEL, LATER as Deinterlace)],
  ['エンコーダ', wordFor(ENCODER_LABEL, LATER as EncodeEncoder)],
  ['エンコーダを変えた理由', wordFor(SWERVE_LABEL, LATER as EncodeSwerve)],
  ['失敗の分類', wordFor(FAILURE_LABEL, LATER as EncodeFailure)],
  ['設定の撤去', wordFor(REMOVAL_LABEL, LATER as EncodeRemoved)],
]

test('エンコードの語彙は、この版が知らない値でも日本語で閉じる', () => {
  for (const [named, said] of EVERY_TABLE) {
    assert.equal(said, NOT_YET_IN_THIS_BUILD, `${named} が代替を返していない`)
    assert.doesNotMatch(
      said,
      /somethingTheApiAddedLater/,
      `${named} が内部の値を出している`,
    )
  }
})
