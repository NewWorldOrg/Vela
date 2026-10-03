import assert from 'node:assert/strict'
import { test } from 'node:test'

import { SEARCH_GENRE_OPTIONS } from '@/lib/search-condition'
import {
  SUBGENRE_OPTIONS,
  subgenreLabelOf,
  subgenreOfValue,
} from '@/lib/subgenres'

test('every genre the screen offers has subgenres, and each ends with the rest', () => {
  for (const genre of SEARCH_GENRE_OPTIONS) {
    const under = SUBGENRE_OPTIONS.filter((one) => one.kind === genre.kind)

    assert.ok(under.length > 0, genre.label)
    assert.equal(under.at(-1)?.value, `${genre.kind}-15`)
    assert.equal(under.at(-1)?.label, 'その他')
  }
})

test('a subgenre is named once, by the pair the API reads', () => {
  const values = SUBGENRE_OPTIONS.map((one) => one.value)

  assert.equal(new Set(values).size, values.length)

  for (const one of SUBGENRE_OPTIONS) {
    assert.equal(one.value, `${one.kind}-${one.sort}`)
    assert.ok(one.sort >= 0 && one.sort <= 15, one.value)
  }
})

test('a subgenre says which genre it sits under, since every genre has a rest', () => {
  assert.equal(subgenreLabelOf('7-0'), '国内アニメ(アニメ/特撮)')
  assert.equal(subgenreLabelOf('3-15'), 'その他(ドラマ)')
  assert.equal(subgenreLabelOf('15-15'), 'その他(その他)')
})

test('a pair outside the table is not a subgenre the screen can show', () => {
  assert.equal(subgenreOfValue('3-9'), undefined)
  assert.equal(subgenreOfValue('12-0'), undefined)
  assert.equal(subgenreLabelOf('3-9'), '3-9')
})
