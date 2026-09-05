import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  asksBeforeCallingOff,
  callsOff,
  headwayPercent,
  jobStatusIn,
  labelProblem,
  pageIn,
  rateControlProblem,
  secondsBetween,
} from './encode.ts'

test('a status in the address is one of the five, or nothing', () => {
  assert.equal(jobStatusIn('queued'), 'queued')
  assert.equal(jobStatusIn(['failed', 'queued']), 'failed')
  assert.equal(jobStatusIn('all'), undefined)
  assert.equal(jobStatusIn(''), undefined)
  assert.equal(jobStatusIn(undefined), undefined)
})

test('a page in the address is a positive whole number, else the first', () => {
  assert.equal(pageIn('3'), 3)
  assert.equal(pageIn(['2']), 2)
  assert.equal(pageIn('0'), 1)
  assert.equal(pageIn('-1'), 1)
  assert.equal(pageIn('02'), 1)
  assert.equal(pageIn('two'), 1)
  assert.equal(pageIn(undefined), 1)
})

test('headway is a whole percentage, wherever the API wrote the portion', () => {
  assert.equal(headwayPercent(0.4249), 42)
  assert.equal(headwayPercent('0.5'), 50)
  assert.equal(headwayPercent(1), 100)
  assert.equal(headwayPercent(null), undefined)
  assert.equal(headwayPercent(undefined), undefined)
})

test('seconds between two instants never runs backwards', () => {
  assert.equal(
    secondsBetween('2026-09-05T11:33:19Z', new Date('2026-09-05T11:41:00Z')),
    461,
  )
  assert.equal(
    secondsBetween('2026-09-05T11:41:00Z', new Date('2026-09-05T11:33:19Z')),
    0,
  )
})

test('a job still waiting or still running can be called off from the screen', () => {
  assert.equal(callsOff('queued'), true)
  assert.equal(callsOff('running'), true)
  assert.equal(callsOff('completed'), false)
  assert.equal(callsOff('failed'), false)
  assert.equal(callsOff('cancelled'), false)
})

test('only calling off a running job, which throws work away, asks first', () => {
  assert.equal(asksBeforeCallingOff('running'), true)
  assert.equal(asksBeforeCallingOff('queued'), false)
  assert.equal(asksBeforeCallingOff('completed'), false)
  assert.equal(asksBeforeCallingOff('failed'), false)
  assert.equal(asksBeforeCallingOff('cancelled'), false)
})

test('a label is a name a person reads, within the length the API keeps', () => {
  assert.equal(labelProblem('視聴用'), undefined)
  assert.equal(labelProblem('  '), '名称を入力してください。')
  assert.equal(labelProblem('あ'.repeat(65)), '名称は 64 文字までです。')
  assert.equal(labelProblem('あ'.repeat(64)), undefined)
})

test('a rate control value is a whole number from 0 to 51', () => {
  assert.equal(rateControlProblem('22'), undefined)
  assert.equal(rateControlProblem('0'), undefined)
  assert.equal(rateControlProblem('51'), undefined)
  assert.equal(rateControlProblem('52'), '0 〜 51 です。')
  assert.equal(rateControlProblem('2.5'), '半角数字で入力してください。')
  assert.equal(rateControlProblem(''), '半角数字で入力してください。')
})
