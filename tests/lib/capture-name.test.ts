import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  capturedAt,
  capturedName,
  capturedOn,
  inAFileName,
} from '@/lib/capture-name'

test('the position is the recording own time, with the hour only where there is one', () => {
  assert.equal(capturedAt(1572), '26-12')
  assert.equal(capturedAt(3873), '1-04-33')
  assert.equal(capturedAt(0), '0-00')
})

test('a title cannot reach a path through the name it is given', () => {
  assert.equal(inAFileName('金曜シネマ「約束の丘」'), '金曜シネマ「約束の丘」')
  assert.equal(inAFileName('../../etc/passwd'), '....etcpasswd')
  assert.equal(inAFileName('報道:特集?<夜>'), '報道特集夜')
})

test('a title that is nothing but a path leaves the moment standing alone', () => {
  assert.equal(capturedName('///', '26-12'), '26-12.png')
  assert.equal(capturedName('  ', '26-12'), '26-12.png')
})

test('the name is the programme and the moment, in that order', () => {
  assert.equal(capturedName('金曜シネマ', '26-12'), '金曜シネマ 26-12.png')
})

test('the moment a live capture is named after is read in the broadcast own zone', () => {
  assert.equal(
    capturedOn(Date.parse('2026-09-07T12:34:05Z')),
    '2026-09-07 21-34-05',
  )
  assert.equal(
    capturedOn(Date.parse('2026-09-07T15:30:00Z')),
    '2026-09-08 00-30-00',
  )
})
