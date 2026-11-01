import type { SearchTerms } from '@/repository/search-options'

/** The conditions as they are being set, the words still as typed. */
export interface SearchDraft extends Omit<SearchTerms, 'q' | 'exclude'> {
  q: string
  exclude: string
}

export function draftOf(terms: SearchTerms): SearchDraft {
  return { ...terms, q: terms.q ?? '', exclude: terms.exclude ?? '' }
}

export function termsOf(draft: SearchDraft): SearchTerms {
  return {
    ...draft,
    q: draft.q.trim() || undefined,
    exclude: draft.exclude.trim() || undefined,
  }
}
