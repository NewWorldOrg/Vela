import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  SEARCH_DEFAULT_FIELDS,
  SEARCH_DEFAULT_PER_PAGE,
  SEARCH_DEFAULT_SORT,
  SEARCH_MOST_CHANNELS,
  SEARCH_QUERY_KEYS,
  narrowsAnything,
  readSearchCondition,
} from './search-condition.ts'

test('an empty address asks for nothing but the defaults', () => {
  const condition = readSearchCondition({})

  assert.equal(condition.q, undefined)
  assert.equal(condition.exclude, undefined)
  assert.equal(condition.fields, SEARCH_DEFAULT_FIELDS)
  assert.deepEqual(condition.genres, [])
  assert.equal(condition.kind, undefined)
  assert.deepEqual(condition.channels, [])
  assert.equal(condition.sort, SEARCH_DEFAULT_SORT)
  assert.equal(condition.perPage, SEARCH_DEFAULT_PER_PAGE)
  assert.equal(condition.page, 1)
})

test('a keyword keeps its words and loses the space around them', () => {
  assert.equal(readSearchCondition({ q: '  夏 絶景  ' }).q, '夏 絶景')
})

test('a keyword of nothing but space is the same as none', () => {
  assert.equal(readSearchCondition({ q: '   ' }).q, undefined)
})

test('an excluded keyword is read the same way as the keyword', () => {
  assert.equal(
    readSearchCondition({ exclude: ' 再放送 ダイジェスト ' }).exclude,
    '再放送 ダイジェスト',
  )
  assert.equal(readSearchCondition({ exclude: '  ' }).exclude, undefined)
})

test('the fields to look in are read from the list the screen offers', () => {
  assert.equal(readSearchCondition({ fields: 'title' }).fields, 'title')
  assert.equal(
    readSearchCondition({ fields: 'description' }).fields,
    'description',
  )
  assert.equal(
    readSearchCondition({ fields: 'title,description' }).fields,
    'title,description',
  )
})

test('a field nobody offers falls back to looking in both', () => {
  assert.equal(
    readSearchCondition({ fields: 'summary;DROP TABLE programme' }).fields,
    SEARCH_DEFAULT_FIELDS,
  )
})

test('genres arrive as their own key repeated', () => {
  assert.deepEqual(
    readSearchCondition({ genre: ['documentary', 'movie'] }).genres,
    ['documentary', 'movie'],
  )
})

test('one genre may arrive on its own', () => {
  assert.deepEqual(readSearchCondition({ genre: 'movie' }).genres, ['movie'])
})

test('a genre nobody offers is dropped rather than passed on', () => {
  assert.deepEqual(
    readSearchCondition({ genre: ['movie', 'wireless'] }).genres,
    ['movie'],
  )
})

test('the same genre twice is still one genre', () => {
  assert.deepEqual(readSearchCondition({ genre: ['movie', 'movie'] }).genres, [
    'movie',
  ])
})

test('a broadcast type is read from the three there are', () => {
  assert.equal(readSearchCondition({ type: 'bs' }).kind, 'bs')
  assert.equal(readSearchCondition({ type: 'GR' }).kind, undefined)
})

test('channels arrive comma joined and keep their order', () => {
  assert.deepEqual(readSearchCondition({ channel: '4-1024,4-1032' }).channels, [
    '4-1024',
    '4-1032',
  ])
})

test('a channel that is not two numbers is dropped', () => {
  assert.deepEqual(
    readSearchCondition({ channel: '4-1024,not-a-channel,4-1032' }).channels,
    ['4-1024', '4-1032'],
  )
})

test('a channel outside the range an identifier has is dropped', () => {
  assert.deepEqual(
    readSearchCondition({ channel: '4-99999,4-1024' }).channels,
    ['4-1024'],
  )
})

test('the same channel twice is still one channel', () => {
  assert.deepEqual(readSearchCondition({ channel: '4-1024,4-1024' }).channels, [
    '4-1024',
  ])
})

test('more channels than the store accepts are cut at the ceiling', () => {
  const asking = Array.from(
    { length: SEARCH_MOST_CHANNELS + 5 },
    (_, index) => `4-${1000 + index}`,
  )

  assert.equal(
    readSearchCondition({ channel: asking.join(',') }).channels.length,
    SEARCH_MOST_CHANNELS,
  )
})

test('a period is read as two calendar dates', () => {
  const condition = readSearchCondition({
    from: '2026-08-09',
    to: '2026-08-15',
  })

  assert.equal(condition.from, '2026-08-09')
  assert.equal(condition.to, '2026-08-15')
})

test('a date that is not a date is dropped', () => {
  assert.equal(readSearchCondition({ from: '2026-02-31' }).from, undefined)
  assert.equal(readSearchCondition({ to: 'tomorrow' }).to, undefined)
})

test('paging falls back rather than being passed on as it arrived', () => {
  assert.equal(readSearchCondition({ page: '0' }).page, 1)
  assert.equal(readSearchCondition({ page: '-3' }).page, 1)
  assert.equal(readSearchCondition({ page: '3' }).page, 3)
  assert.equal(
    readSearchCondition({ per_page: '5000' }).perPage,
    SEARCH_DEFAULT_PER_PAGE,
  )
  assert.equal(readSearchCondition({ per_page: '100' }).perPage, 100)
})

test('a sort nobody offers falls back to the default', () => {
  assert.equal(
    readSearchCondition({ sort: 'name;DROP TABLE programme' }).sort,
    SEARCH_DEFAULT_SORT,
  )
  assert.equal(readSearchCondition({ sort: 'name.asc' }).sort, 'name.asc')
})

test('every condition comes back from the address it was written to', () => {
  const written = {
    q: '夏 絶景',
    exclude: '再放送',
    fields: 'title' as const,
    genre: ['documentary', 'movie'],
    type: 'terrestrial',
    channel: '4-1024,4-1032',
    from: '2026-08-09',
    to: '2026-08-15',
    sort: 'name.asc',
    per_page: '50',
    page: '2',
  }

  assert.deepEqual(readSearchCondition(written), {
    q: '夏 絶景',
    exclude: '再放送',
    fields: 'title',
    genres: ['documentary', 'movie'],
    kind: 'terrestrial',
    channels: ['4-1024', '4-1032'],
    from: '2026-08-09',
    to: '2026-08-15',
    sort: 'name.asc',
    perPage: 50,
    page: 2,
  })
})

test('an address that asks for nothing narrows nothing', () => {
  assert.equal(narrowsAnything(readSearchCondition({})), false)
})

test('a keyword on its own narrows', () => {
  assert.equal(narrowsAnything(readSearchCondition({ q: '絶景' })), true)
})

test('an excluded keyword on its own narrows', () => {
  assert.equal(
    narrowsAnything(readSearchCondition({ exclude: '再放送' })),
    true,
  )
})

test('a genre on its own narrows', () => {
  assert.equal(narrowsAnything(readSearchCondition({ genre: 'movie' })), true)
})

test('a broadcast type on its own narrows', () => {
  assert.equal(narrowsAnything(readSearchCondition({ type: 'bs' })), true)
})

test('a channel on its own narrows', () => {
  assert.equal(
    narrowsAnything(readSearchCondition({ channel: '4-1024' })),
    true,
  )
})

test('either end of a period on its own narrows', () => {
  assert.equal(
    narrowsAnything(readSearchCondition({ from: '2026-08-09' })),
    true,
  )
  assert.equal(narrowsAnything(readSearchCondition({ to: '2026-08-15' })), true)
})

test('the fields to look in narrow nothing without a word to look for', () => {
  assert.equal(narrowsAnything(readSearchCondition({ fields: 'title' })), false)
})

test('the sort and the paging narrow nothing', () => {
  assert.equal(
    narrowsAnything(
      readSearchCondition({ sort: 'name.asc', per_page: '100', page: '3' }),
    ),
    false,
  )
})

test('a condition the address spelled wrongly narrows nothing', () => {
  assert.equal(
    narrowsAnything(
      readSearchCondition({
        genre: 'wireless',
        type: 'GR',
        channel: 'not-a-channel',
        from: 'tomorrow',
        q: '   ',
      }),
    ),
    false,
  )
})

test('the keys the screen clears cover every key it reads', () => {
  const written: Record<string, string | string[]> = {
    q: '夏',
    exclude: '再放送',
    fields: 'title',
    genre: ['movie'],
    type: 'bs',
    channel: '4-1024',
    from: '2026-08-09',
    to: '2026-08-15',
    sort: 'name.asc',
    per_page: '50',
    page: '2',
  }

  for (const key of Object.keys(written)) {
    assert.ok(
      SEARCH_QUERY_KEYS.includes(key),
      `${key} is read but never cleared`,
    )
  }
})
