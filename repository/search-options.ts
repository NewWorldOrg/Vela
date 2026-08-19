/**
 * What the search screen may ask for. The screen offers these and the reader
 * accepts nothing else, so they sit apart from the reading itself: a Client
 * Component may hold them, and nothing that reaches the API comes with them.
 */
export type SearchSort = 'start_at.asc' | 'start_at.desc' | 'name.asc'

export const SEARCH_SORT_OPTIONS: { value: SearchSort; label: string }[] = [
  { value: 'start_at.asc', label: '放送日時が早い順' },
  { value: 'start_at.desc', label: '放送日時が遅い順' },
  { value: 'name.asc', label: '番組名順' },
]

export const SEARCH_PER_PAGE_OPTIONS = [20, 50, 100]

export const SEARCH_DEFAULT_SORT: SearchSort = 'start_at.asc'

export const SEARCH_DEFAULT_PER_PAGE = 20
