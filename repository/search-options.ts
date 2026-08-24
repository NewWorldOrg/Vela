/**
 * What the search screen may ask for. The vocabulary and the reading of an
 * address both live in `lib/search-condition`, which reaches nothing at all;
 * this is the name the screen has always imported them under.
 */
export {
  EMPTY_SEARCH_CONDITION,
  SEARCH_DEFAULT_FIELDS,
  SEARCH_DEFAULT_PER_PAGE,
  SEARCH_DEFAULT_SORT,
  SEARCH_FIELD_OPTIONS,
  SEARCH_GENRE_OPTIONS,
  SEARCH_KIND_OPTIONS,
  SEARCH_PER_PAGE_OPTIONS,
  SEARCH_QUERY_KEYS,
  SEARCH_SORT_OPTIONS,
  genreLabelOf,
  searchConditionOfQuery,
  searchQueryOf,
} from '@/lib/search-condition'

export type {
  SearchCondition,
  SearchField,
  SearchGenre,
  SearchKind,
  SearchSort,
} from '@/lib/search-condition'
