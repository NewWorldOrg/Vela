import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  keptWhileSettling,
  settlementOf,
  whenSettled,
} from '@/hooks/useSettled'

test('what has not settled reads as nothing, and as its value once it has', async () => {
  let arrive: (value: string) => void = () => {}
  const later = new Promise<string>((resolve) => {
    arrive = resolve
  })
  let told = 0

  whenSettled(later, () => {
    told += 1
  })

  assert.equal(settlementOf(later), undefined)

  arrive('夜の番組')
  await later

  assert.deepEqual(settlementOf(later), { value: '夜の番組' })
  assert.equal(told, 1)
})

test('the reading stays the same object between reads, so nothing is drawn again for it', async () => {
  const later = Promise.resolve(1)

  whenSettled(later, () => {})
  await later

  assert.equal(settlementOf(later), settlementOf(later))
})

test('a failure settles as the error it failed with', async () => {
  const failure = new Error('番組表を読めませんでした')
  const later = Promise.reject(failure)

  whenSettled(later, () => {})
  await later.catch(() => undefined)

  assert.deepEqual(settlementOf(later), { error: failure })
})

test('a listener that has left is not told', async () => {
  let arrive: (value: number) => void = () => {}
  const later = new Promise<number>((resolve) => {
    arrive = resolve
  })
  let told = 0
  const leave = whenSettled(later, () => {
    told += 1
  })

  leave()
  arrive(1)
  await later

  assert.equal(told, 0)
})

test('while a new promise is on its way, what the last one settled with stays for the same day and kind', () => {
  const kept = { key: '2026-10-28|terrestrial', value: ['夜の映画'] }

  assert.deepEqual(
    keptWhileSettling(undefined, kept, '2026-10-28|terrestrial'),
    ['夜の映画'],
  )
  assert.deepEqual(
    keptWhileSettling(['深夜の番組'], kept, '2026-10-28|terrestrial'),
    ['深夜の番組'],
  )
  assert.equal(
    keptWhileSettling(undefined, kept, '2026-10-29|terrestrial'),
    undefined,
  )
  assert.equal(keptWhileSettling(undefined, kept, '2026-10-28|bs'), undefined)
  assert.equal(
    keptWhileSettling(undefined, null, '2026-10-28|terrestrial'),
    undefined,
  )
})
