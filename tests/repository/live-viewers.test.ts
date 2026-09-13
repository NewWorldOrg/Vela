import assert from 'node:assert/strict'
import { test } from 'node:test'

import { readLiveViewers } from '@/repository/live-viewers'

function answerOf(items: unknown[]) {
  return {
    status: true,
    message: '',
    data: {
      items,
      total: items.length,
      currentPage: 1,
      lastPage: 1,
      perPage: 200,
    },
  }
}

test('what each channel is being watched by comes back under the id a screen knows it by', () => {
  assert.deepEqual(
    readLiveViewers(
      answerOf([
        { networkId: 1, serviceId: 2, viewers: 3 },
        { networkId: 4, serviceId: 5, viewers: 0 },
      ]),
    ),
    { '1-2': 3, '4-5': 0 },
  )
})

test('the counts the api spells as text are read as numbers', () => {
  assert.deepEqual(
    readLiveViewers(
      answerOf([{ networkId: '1', serviceId: '2', viewers: '7' }]),
    ),
    { '1-2': 7 },
  )
})

test('an answer carrying nothing counts nobody rather than failing', () => {
  assert.deepEqual(readLiveViewers(answerOf([])), {})
  assert.deepEqual(
    readLiveViewers({ status: true, message: '', data: null }),
    {},
  )
})

test('an answer that is not the one this asks for is refused rather than half read', () => {
  assert.equal(readLiveViewers(undefined), null)
  assert.equal(readLiveViewers('<html>'), null)
  assert.equal(
    readLiveViewers(answerOf([{ networkId: 1, serviceId: 2 }])),
    null,
  )
  assert.equal(readLiveViewers(answerOf(['a-channel'])), null)
})

test('the fields beyond the count are left alone, so the read stays a light one', () => {
  assert.deepEqual(
    readLiveViewers(
      answerOf([
        {
          networkId: 1,
          serviceId: 2,
          viewers: 3,
          name: 'a-name',
          sessions: [],
        },
      ]),
    ),
    { '1-2': 3 },
  )
})
