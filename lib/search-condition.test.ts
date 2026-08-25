import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  EMPTY_SEARCH_CONDITION,
  SEARCH_DEFAULT_FIELDS,
  SEARCH_DEFAULT_PER_PAGE,
  SEARCH_DEFAULT_SORT,
  SEARCH_MOST_CHANNELS,
  SEARCH_QUERY_KEYS,
  narrowsAnything,
  readSearchCondition,
  searchConditionOfQuery,
  searchQueryOf,
  searchTermsOf,
  searchTermsQueryOf,
  searchViewingOf,
} from './search-condition.ts'
import type { SearchCondition } from './search-condition.ts'

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

/**
 * Every condition the screen can hold at once. The round trip is only worth
 * anything if nothing here is left at its default: a key that is written but
 * never read back, or read back but never written, only shows up when both
 * sides of it were asked for.
 */
const everyCondition: SearchCondition = {
  q: '夏 絶景',
  exclude: '再放送',
  fields: 'title',
  genres: ['news', 'documentary'],
  kind: 'terrestrial',
  channels: ['32736-1024', '32737-1032'],
  from: '2026-08-21',
  to: '2026-08-27',
  sort: 'name.asc',
  perPage: 50,
  page: 3,
}

test('an address written from a condition reads back as that condition', () => {
  assert.deepEqual(
    searchConditionOfQuery(searchQueryOf(everyCondition)),
    everyCondition,
  )
})

test('a fully asked condition writes every key the screen owns, and no other', () => {
  const written = new URLSearchParams(searchQueryOf(everyCondition))

  assert.deepEqual(
    [...new Set(written.keys())].sort(),
    [...SEARCH_QUERY_KEYS].sort(),
  )
})

test('a condition that asks for nothing writes a bare address', () => {
  assert.equal(searchQueryOf(EMPTY_SEARCH_CONDITION), '')
  assert.deepEqual(searchConditionOfQuery(''), EMPTY_SEARCH_CONDITION)
})

test('what a reader would have supplied anyway is left out', () => {
  const written = new URLSearchParams(
    searchQueryOf({
      ...EMPTY_SEARCH_CONDITION,
      q: '観測所',
      fields: SEARCH_DEFAULT_FIELDS,
      sort: SEARCH_DEFAULT_SORT,
      perPage: SEARCH_DEFAULT_PER_PAGE,
      page: 1,
    }),
  )

  assert.deepEqual([...written.keys()], ['q'])
})

test('a second genre joins the first rather than replacing it', () => {
  const first = searchConditionOfQuery(
    searchQueryOf({ ...EMPTY_SEARCH_CONDITION, genres: ['news'] }),
  )

  assert.deepEqual(first.genres, ['news'])

  const second = searchConditionOfQuery(
    searchQueryOf({ ...first, genres: [...first.genres, 'documentary'] }),
  )

  assert.deepEqual(second.genres, ['news', 'documentary'])

  const third = searchConditionOfQuery(
    searchQueryOf({ ...second, genres: [...second.genres, 'movie'] }),
  )

  assert.deepEqual(third.genres, ['news', 'documentary', 'movie'])
})

test('picking a genre leaves every other condition where it was', () => {
  const after = searchConditionOfQuery(
    searchQueryOf({
      ...everyCondition,
      genres: [...everyCondition.genres, 'movie'],
    }),
  )

  assert.deepEqual(after, {
    ...everyCondition,
    genres: ['news', 'documentary', 'movie'],
    page: 3,
  })
})

test('a second channel joins the first rather than replacing it', () => {
  const first = searchConditionOfQuery(
    searchQueryOf({ ...EMPTY_SEARCH_CONDITION, channels: ['32736-1024'] }),
  )

  assert.deepEqual(first.channels, ['32736-1024'])

  const second = searchConditionOfQuery(
    searchQueryOf({ ...first, channels: [...first.channels, '32737-1032'] }),
  )

  assert.deepEqual(second.channels, ['32736-1024', '32737-1032'])
})

test('a condition with no keyword still asks for something', () => {
  const condition = searchConditionOfQuery(
    searchQueryOf({
      ...EMPTY_SEARCH_CONDITION,
      genres: ['documentary'],
      kind: 'terrestrial',
    }),
  )

  assert.equal(condition.q, undefined)
  assert.equal(narrowsAnything(condition), true)
})

test('a condition of nothing at all is the only one turned away', () => {
  assert.equal(narrowsAnything(EMPTY_SEARCH_CONDITION), false)
  assert.equal(
    narrowsAnything(
      searchConditionOfQuery(
        searchQueryOf({ ...EMPTY_SEARCH_CONDITION, fields: 'title' }),
      ),
    ),
    false,
  )
})

/**
 * The two halves of a condition. What the reader is asking for is assembled
 * and confirmed in one go; how the answer is arranged takes effect where it is
 * chosen. Nothing may fall between the two, and nothing may be in both — a key
 * left out of the split is a key the screen would stop being able to hold, and
 * a key in both is a way of showing the answer that would confirm a question
 * nobody put.
 */
test('every part of a condition is either asked for or a way of showing it', () => {
  const asked = Object.keys(searchTermsOf(everyCondition))
  const shown = Object.keys(searchViewingOf(everyCondition))

  assert.deepEqual(
    [...asked, ...shown].sort(),
    Object.keys(everyCondition).sort(),
  )
  assert.deepEqual(
    asked.filter((key) => shown.includes(key)),
    [],
  )
})

test('the two halves put back together are the condition they came from', () => {
  assert.deepEqual(
    { ...searchTermsOf(everyCondition), ...searchViewingOf(everyCondition) },
    everyCondition,
  )
})

test('the address of the conditions alone leaves out how the answer is shown', () => {
  const written = new URLSearchParams(searchTermsQueryOf(everyCondition))

  assert.deepEqual(
    [...new Set(written.keys())].sort(),
    ['q', 'exclude', 'fields', 'genre', 'type', 'channel', 'from', 'to'].sort(),
  )
})

test('the conditions alone are spelled the way the whole condition spells them', () => {
  const whole = new URLSearchParams(searchQueryOf(everyCondition))
  const terms = new URLSearchParams(searchTermsQueryOf(everyCondition))

  for (const key of new Set(terms.keys())) {
    assert.deepEqual(terms.getAll(key), whole.getAll(key), key)
  }
})

test('two conditions arranged differently ask the same question', () => {
  const arrangedAnotherWay: SearchCondition = {
    ...everyCondition,
    sort: 'start_at.desc',
    perPage: 100,
    page: 7,
  }

  assert.equal(
    searchTermsQueryOf(arrangedAnotherWay),
    searchTermsQueryOf(everyCondition),
  )
})

test('each condition on its own reaches the address of the conditions', () => {
  const alone: [Partial<SearchCondition>, string][] = [
    [{ q: '観測所' }, 'q'],
    [{ exclude: '再放送' }, 'exclude'],
    [{ fields: 'title' }, 'fields'],
    [{ genres: ['movie'] }, 'genre'],
    [{ kind: 'bs' }, 'type'],
    [{ channels: ['4-1024'] }, 'channel'],
    [{ from: '2026-08-21' }, 'from'],
    [{ to: '2026-08-27' }, 'to'],
  ]

  for (const [asked, key] of alone) {
    const one: SearchCondition = { ...EMPTY_SEARCH_CONDITION, ...asked }

    assert.deepEqual(
      [...new URLSearchParams(searchTermsQueryOf(one)).keys()],
      [key],
    )
  }
})

test('a condition asking for nothing has a bare address of its own', () => {
  assert.equal(searchTermsQueryOf(EMPTY_SEARCH_CONDITION), '')
})
