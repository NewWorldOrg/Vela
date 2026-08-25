/**
 * What the search screen may ask for, and how its address is read back.
 *
 * The screen offers these and the reader accepts nothing else, so an address
 * that was tampered with comes back as the nearest thing the screen could have
 * written. Nothing here reaches the API, so a Client Component may hold it.
 */

export type SearchSort = 'start_at.asc' | 'start_at.desc' | 'name.asc'

export type SearchField = 'title,description' | 'title' | 'description'

export type SearchGenre =
  | 'news'
  | 'sports'
  | 'info'
  | 'drama'
  | 'music'
  | 'variety'
  | 'movie'
  | 'anime'
  | 'documentary'
  | 'stage'
  | 'hobby'
  | 'welfare'
  | 'other'

export type SearchKind = 'terrestrial' | 'bs' | 'cs110'

export const SEARCH_SORT_OPTIONS: { value: SearchSort; label: string }[] = [
  { value: 'start_at.asc', label: '放送日時が早い順' },
  { value: 'start_at.desc', label: '放送日時が遅い順' },
  { value: 'name.asc', label: '番組名順' },
]

export const SEARCH_FIELD_OPTIONS: { value: SearchField; label: string }[] = [
  { value: 'title,description', label: '番組名と概要' },
  { value: 'title', label: '番組名だけ' },
  { value: 'description', label: '概要だけ' },
]

/** 大分類。値は URL に載る綴り、kind は放送規格の番号。 */
export const SEARCH_GENRE_OPTIONS: {
  value: SearchGenre
  kind: number
  label: string
}[] = [
  { value: 'news', kind: 0, label: 'ニュース/報道' },
  { value: 'sports', kind: 1, label: 'スポーツ' },
  { value: 'info', kind: 2, label: '情報/ワイドショー' },
  { value: 'drama', kind: 3, label: 'ドラマ' },
  { value: 'music', kind: 4, label: '音楽' },
  { value: 'variety', kind: 5, label: 'バラエティ' },
  { value: 'movie', kind: 6, label: '映画' },
  { value: 'anime', kind: 7, label: 'アニメ/特撮' },
  { value: 'documentary', kind: 8, label: 'ドキュメンタリー/教養' },
  { value: 'stage', kind: 9, label: '劇場/公演' },
  { value: 'hobby', kind: 10, label: '趣味/教育' },
  { value: 'welfare', kind: 11, label: '福祉' },
  { value: 'other', kind: 15, label: 'その他' },
]

export const SEARCH_KIND_OPTIONS: { value: SearchKind; label: string }[] = [
  { value: 'terrestrial', label: '地上' },
  { value: 'bs', label: 'BS' },
  { value: 'cs110', label: 'CS110' },
]

export const SEARCH_PER_PAGE_OPTIONS = [20, 50, 100]

export const SEARCH_DEFAULT_SORT: SearchSort = 'start_at.asc'

export const SEARCH_DEFAULT_PER_PAGE = 20

export const SEARCH_DEFAULT_FIELDS: SearchField = 'title,description'

/** 検索の店が受け付けるチャンネル数の上限。 */
export const SEARCH_MOST_CHANNELS = 64

/** 「条件をすべて消す」が消す先。読む鍵はすべてここに現れる。 */
export const SEARCH_QUERY_KEYS = [
  'q',
  'exclude',
  'fields',
  'genre',
  'type',
  'channel',
  'from',
  'to',
  'sort',
  'per_page',
  'page',
]

export interface RawSearchCondition {
  q?: string
  exclude?: string
  fields?: string
  genre?: string | string[]
  type?: string
  channel?: string
  from?: string
  to?: string
  sort?: string
  per_page?: string
  page?: string
}

/**
 * 検索条件 — what the reader is asking the store to look for.
 *
 * These are assembled in the fields and confirmed in one go, so a condition
 * half typed is not a condition anybody asked for.
 */
export interface SearchTerms {
  q?: string
  exclude?: string
  fields: SearchField
  genres: SearchGenre[]
  kind?: SearchKind
  /** `network-service`。番組表のチャンネルと同じ綴り */
  channels: string[]
  /** 放送日(JST 4:00 区切り)。`YYYY-MM-DD` */
  from?: string
  to?: string
}

/**
 * 結果の見せ方 — how what was already asked for is arranged.
 *
 * Nothing here changes which programmes come back, so there is nothing to
 * assemble and nothing to confirm: each of them takes effect where it is
 * chosen.
 */
export interface SearchViewing {
  sort: SearchSort
  perPage: number
  page: number
}

export interface SearchCondition extends SearchTerms, SearchViewing {}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const PAGE_PATTERN = /^[1-9]\d*$/

const CHANNEL_PATTERN = /^(\d{1,5})-(\d{1,5})$/

const HIGHEST_IDENTIFIER = 65535

function words(value: string | undefined): string | undefined {
  return value?.trim() || undefined
}

function calendarDate(value: string | undefined): string | undefined {
  if (!value || !DATE_PATTERN.test(value)) {
    return undefined
  }

  const at = new Date(`${value}T00:00:00Z`)

  if (Number.isNaN(at.getTime()) || at.toISOString().slice(0, 10) !== value) {
    return undefined
  }

  return value
}

function genres(asked: string | string[] | undefined): SearchGenre[] {
  const named = asked === undefined ? [] : [asked].flat()
  const kept: SearchGenre[] = []

  for (const one of named) {
    const offered = SEARCH_GENRE_OPTIONS.find((option) => option.value === one)

    if (offered && !kept.includes(offered.value)) {
      kept.push(offered.value)
    }
  }

  return kept
}

function channels(asked: string | undefined): string[] {
  const kept: string[] = []

  for (const one of (asked ?? '').split(',')) {
    const read = CHANNEL_PATTERN.exec(one.trim())

    if (
      read &&
      Number(read[1]) <= HIGHEST_IDENTIFIER &&
      Number(read[2]) <= HIGHEST_IDENTIFIER &&
      !kept.includes(one.trim())
    ) {
      kept.push(one.trim())
    }
  }

  return kept.slice(0, SEARCH_MOST_CHANNELS)
}

/**
 * The shape `searchParams` arrives in, named as the keys this module reads.
 *
 * A key that was asked for more than once arrives as a list, and only `genre`
 * is allowed to repeat; everything else takes the single value or nothing, so a
 * repeated `q` is not quietly read as its first spelling.
 */
export function rawSearchConditionOf(
  asked: Record<string, string | string[] | undefined>,
): RawSearchCondition {
  const one = (key: string): string | undefined => {
    const value = asked[key]

    return typeof value === 'string' ? value : undefined
  }

  return {
    q: one('q'),
    exclude: one('exclude'),
    fields: one('fields'),
    genre: asked.genre,
    type: one('type'),
    channel: one('channel'),
    from: one('from'),
    to: one('to'),
    sort: one('sort'),
    per_page: one('per_page'),
    page: one('page'),
  }
}

export function readSearchCondition(raw: RawSearchCondition): SearchCondition {
  return {
    q: words(raw.q),
    exclude: words(raw.exclude),
    fields:
      SEARCH_FIELD_OPTIONS.find((option) => option.value === raw.fields)
        ?.value ?? SEARCH_DEFAULT_FIELDS,
    genres: genres(raw.genre),
    kind: SEARCH_KIND_OPTIONS.find((option) => option.value === raw.type)
      ?.value,
    channels: channels(raw.channel),
    from: calendarDate(raw.from),
    to: calendarDate(raw.to),
    sort:
      SEARCH_SORT_OPTIONS.find((option) => option.value === raw.sort)?.value ??
      SEARCH_DEFAULT_SORT,
    perPage:
      SEARCH_PER_PAGE_OPTIONS.find((count) => String(count) === raw.per_page) ??
      SEARCH_DEFAULT_PER_PAGE,
    page: raw.page && PAGE_PATTERN.test(raw.page) ? Number(raw.page) : 1,
  }
}

/** A condition that asks for nothing, spelled by the reader itself. */
export const EMPTY_SEARCH_CONDITION: SearchCondition = readSearchCondition({})

/** 条件の側だけを取り出す。 */
export function searchTermsOf(condition: SearchCondition): SearchTerms {
  return {
    q: condition.q,
    exclude: condition.exclude,
    fields: condition.fields,
    genres: condition.genres,
    kind: condition.kind,
    channels: condition.channels,
    from: condition.from,
    to: condition.to,
  }
}

/** 見せ方の側だけを取り出す。 */
export function searchViewingOf(condition: SearchCondition): SearchViewing {
  return {
    sort: condition.sort,
    perPage: condition.perPage,
    page: condition.page,
  }
}

function writeTerms(params: URLSearchParams, terms: SearchTerms): void {
  if (terms.q) {
    params.set('q', terms.q)
  }

  if (terms.exclude) {
    params.set('exclude', terms.exclude)
  }

  if (terms.fields !== SEARCH_DEFAULT_FIELDS) {
    params.set('fields', terms.fields)
  }

  for (const genre of terms.genres) {
    params.append('genre', genre)
  }

  if (terms.kind) {
    params.set('type', terms.kind)
  }

  if (terms.channels.length > 0) {
    params.set('channel', terms.channels.join(','))
  }

  if (terms.from) {
    params.set('from', terms.from)
  }

  if (terms.to) {
    params.set('to', terms.to)
  }
}

function writeViewing(params: URLSearchParams, viewing: SearchViewing): void {
  if (viewing.sort !== SEARCH_DEFAULT_SORT) {
    params.set('sort', viewing.sort)
  }

  if (viewing.perPage !== SEARCH_DEFAULT_PER_PAGE) {
    params.set('per_page', String(viewing.perPage))
  }

  if (viewing.page > 1) {
    params.set('page', String(viewing.page))
  }
}

/**
 * The address the conditions alone are written to.
 *
 * This is what the screen compares one set of conditions with another by: two
 * addresses that differ only in how the result is arranged hold the same
 * question, and the fields the reader is filling in are left where they are.
 */
export function searchTermsQueryOf(terms: SearchTerms): string {
  const params = new URLSearchParams()

  writeTerms(params, terms)

  return params.toString()
}

/**
 * The address a condition is written to — the inverse of reading one.
 *
 * A condition that does not survive the trip is a condition the screen cannot
 * hold. What a reader would have supplied anyway is left out, which is why an
 * untouched screen has a bare address and why the count of conditions can be
 * taken from the condition rather than from the address.
 */
export function searchQueryOf(condition: SearchCondition): string {
  const params = new URLSearchParams()

  writeTerms(params, condition)
  writeViewing(params, condition)

  return params.toString()
}

/** The condition an address holds, read the way a request would deliver it. */
export function searchConditionOfQuery(query: string): SearchCondition {
  const params = new URLSearchParams(query)
  const asked: Record<string, string | string[]> = {}

  for (const key of new Set(params.keys())) {
    const all = params.getAll(key)
    asked[key] = all.length > 1 ? all : all[0]
  }

  return readSearchCondition(rawSearchConditionOf(asked))
}

/**
 * Whether the address asks for anything the store can narrow by.
 *
 * The fields to look in are not such a thing: they only choose where a keyword
 * and an excluded keyword are looked for, so on their own they leave every
 * programme in. Neither are the sort and the paging, which only arrange what
 * came back.
 */
export function narrowsAnything(terms: SearchTerms): boolean {
  return Boolean(
    terms.q ||
    terms.exclude ||
    terms.genres.length ||
    terms.kind ||
    terms.channels.length ||
    terms.from ||
    terms.to,
  )
}

export function genreLabelOf(genre: SearchGenre): string {
  return (
    SEARCH_GENRE_OPTIONS.find((option) => option.value === genre)?.label ??
    genre
  )
}

export function genreKindsOf(asked: SearchGenre[]): number[] {
  return SEARCH_GENRE_OPTIONS.filter((option) =>
    asked.includes(option.value),
  ).map((option) => option.kind)
}
