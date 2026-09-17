import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  asksBeforeCallingOff,
  callsOff,
  encodeRowOf,
  headwayPercent,
  jobStatusIn,
  labelProblem,
  pageIn,
  rateControlProblem,
  secondsBetween,
} from '@/lib/encode'
import type { EncodeJob } from '@/repository/encode'

type Standing = Pick<
  EncodeJob,
  'status' | 'failure' | 'stalled' | 'waitingForAViewer'
>

const job = (over: Partial<Standing> = {}): Standing => ({
  status: 'queued',
  stalled: false,
  waitingForAViewer: false,
  ...over,
})

test('a recording with no job says the one word the API folded', () => {
  assert.deepEqual(encodeRowOf(undefined, 'notEncoded', true), {
    main: '未エンコード',
    cancels: false,
  })
  assert.deepEqual(encodeRowOf(undefined, 'completed', true), {
    main: '完了',
    cancels: false,
  })
})

test('a recording the automatic run was told to leave alone says that, not that it is waiting', () => {
  assert.deepEqual(encodeRowOf(undefined, 'notEncoded', false), {
    main: '自動実行の対象外',
    cancels: false,
  })
})

test('every standing but unencoded is said the same whether it was to be encoded or not', () => {
  for (const standing of [
    'queued',
    'running',
    'completed',
    'failed',
  ] as const) {
    assert.deepEqual(
      encodeRowOf(undefined, standing, false),
      encodeRowOf(undefined, standing, true),
    )
  }
})

test('the latest job says where it stands, and why when it is held', () => {
  assert.deepEqual(encodeRowOf(job(), 'queued', true), {
    main: '待機中',
    cancels: true,
  })
  assert.deepEqual(
    encodeRowOf(job({ waitingForAViewer: true }), 'queued', true),
    {
      main: '待機中',
      sub: '視聴者待ち',
      cancels: true,
    },
  )
  assert.deepEqual(
    encodeRowOf(job({ status: 'running', stalled: true }), 'running', true),
    { main: '実行中', sub: '停滞', cancels: true },
  )
})

test('a job called off on a recording nothing was encoded for says so', () => {
  assert.deepEqual(
    encodeRowOf(job({ status: 'cancelled' }), 'notEncoded', true),
    {
      main: '中止',
      cancels: false,
    },
  )
})

test('a job called off on a recording the automatic run left alone still says so', () => {
  assert.deepEqual(
    encodeRowOf(job({ status: 'cancelled' }), 'notEncoded', false),
    {
      main: '中止',
      cancels: false,
    },
  )
})

test('a job called off after one that finished does not unsay the finished one', () => {
  assert.deepEqual(
    encodeRowOf(job({ status: 'cancelled' }), 'completed', true),
    {
      main: '完了',
      cancels: false,
    },
  )
})

test('a job that is not the one the standing was folded from adds nothing', () => {
  assert.deepEqual(
    encodeRowOf(
      job({ status: 'queued', waitingForAViewer: true }),
      'running',
      true,
    ),
    { main: '実行中', cancels: false },
  )
})

test('a failed job names the class it failed in', () => {
  assert.deepEqual(
    encodeRowOf(
      job({
        status: 'failed',
        failure: {
          failure: 'notEnoughRoom',
          note: 'No space left on device',
          noticedAt: '2026/08/07 23:13',
        },
      }),
      'failed',
      true,
    ),
    { main: '失敗', sub: '容量不足', cancels: false },
  )
})

test('a failure class this build does not know is still said', () => {
  assert.deepEqual(
    encodeRowOf(
      job({
        status: 'failed',
        failure: {
          failure: 'aNewWayToFail' as NonNullable<
            EncodeJob['failure']
          >['failure'],
          note: '',
          noticedAt: '2026/08/07 23:13',
        },
      }),
      'failed',
      true,
    ),
    { main: '失敗', sub: 'この版がまだ知らない値', cancels: false },
  )
})

test('a status or a standing this build does not know is still said', () => {
  assert.deepEqual(
    encodeRowOf(
      job({ status: 'somewhereNew' as EncodeJob['status'] }),
      'failed',
      true,
    ),
    { main: '失敗', cancels: false },
  )
  assert.deepEqual(
    encodeRowOf(
      undefined,
      'somethingNew' as Parameters<typeof encodeRowOf>[1],
      true,
    ),
    { main: 'この版がまだ知らない値', cancels: false },
  )
})

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
