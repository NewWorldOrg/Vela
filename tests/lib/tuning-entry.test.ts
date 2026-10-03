import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { TuningEntry } from '@/lib/tuning-entry'
import {
  EMPTY_TUNING_ENTRY,
  readTuningEntry,
  tuningChannelRangeOf,
} from '@/lib/tuning-entry'

const entry = (over: Partial<TuningEntry>): TuningEntry => ({
  ...EMPTY_TUNING_ENTRY,
  ...over,
})

const refusalOf = (over: Partial<TuningEntry>) => {
  const reading = readTuningEntry(entry(over))

  return reading.state === 'refused' ? reading.problem : undefined
}

test('an entry starts on terrestrial with nothing written', () => {
  assert.deepEqual(EMPTY_TUNING_ENTRY, {
    system: 'isdbT',
    channel: '',
    stream: '',
  })
})

test('a terrestrial channel in range is read without a stream', () => {
  assert.deepEqual(readTuningEntry(entry({ channel: ' 21 ', stream: '9' })), {
    state: 'read',
    tuning: {
      system: 'isdbT',
      physicalChannel: 21,
      transportStreamId: undefined,
    },
  })
})

test('a BS slot is read with the stream it names', () => {
  assert.deepEqual(
    readTuningEntry(
      entry({ system: 'isdbSBs', channel: '15', stream: '16625' }),
    ),
    {
      state: 'read',
      tuning: {
        system: 'isdbSBs',
        physicalChannel: 15,
        transportStreamId: 16625,
      },
    },
  )
})

test('a channel that is not a number is refused at the channel', () => {
  for (const channel of ['', 'abc', '2.5', '-3']) {
    assert.deepEqual(refusalOf({ channel }), {
      field: 'channel',
      text: '物理チャンネルを半角数字で入力してください。',
    })
  }
})

test('a channel outside what the system carries is refused with the range', () => {
  assert.deepEqual(refusalOf({ channel: '12' }), {
    field: 'channel',
    text: '地上波の物理チャンネルは 13 〜 62 です。',
  })
  assert.deepEqual(
    refusalOf({ system: 'isdbSBs', channel: '7', stream: '1' }),
    {
      field: 'channel',
      text: 'BSの物理チャンネルは 1 〜 23 の奇数(7 と 17 を除く) です。',
    },
  )
  assert.deepEqual(refusalOf({ system: 'isdbSCs110', channel: '3' }), {
    field: 'channel',
    text: 'CS110の物理チャンネルは 2 〜 24 の偶数 です。',
  })
})

test('a BS slot without a stream, or with one too large, is refused at the stream', () => {
  assert.deepEqual(refusalOf({ system: 'isdbSBs', channel: '15' }), {
    field: 'stream',
    text: 'BS はスロット内の TSID を半角数字で入力してください。',
  })
  assert.deepEqual(
    refusalOf({ system: 'isdbSBs', channel: '15', stream: '65536' }),
    { field: 'stream', text: 'TSID は 0 〜 65535 です。' },
  )
})

test('only BS asks for a stream', () => {
  assert.equal(tuningChannelRangeOf('isdbT').ts, false)
  assert.equal(tuningChannelRangeOf('isdbSBs').ts, true)
  assert.equal(tuningChannelRangeOf('isdbSCs110').ts, false)
})
