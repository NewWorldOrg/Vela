import assert from 'node:assert/strict'
import { test } from 'node:test'

import { SEARCH_GENRE_OPTIONS } from '@/lib/search-condition'
import { SUBGENRE_OPTIONS, subgenreOfValue } from '@/lib/subgenres'

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

test('a pair outside the table is not a subgenre the screen can show', () => {
  assert.equal(subgenreOfValue('3-9'), undefined)
  assert.equal(subgenreOfValue('12-0'), undefined)
})
