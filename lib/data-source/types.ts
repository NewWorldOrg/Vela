import type { SortState } from '@/types/dataTable'

/**
 * Provider-agnostic data-access seam.
 *
 * Repositories depend on this interface, never on a concrete transport. The
 * default implementation is in-memory (`createInMemoryDataSource`); an
 * `http`/`db` implementation can be dropped in by changing only the wiring in
 * `lib/dataSource.ts` — repository signatures and UI stay untouched.
 */

export interface ListQuery {
  page: number
  perPage: number
  sort?: SortState
  /** Field → substring match (case-insensitive). Empty values are ignored. */
  filters?: Record<string, string>
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  perPage: number
  lastPage: number
}

export interface DataSource {
  /** List a collection with paging, sorting and filtering. */
  list<T>(collection: string, query: ListQuery): Promise<Page<T>>
  /** Find a single record by its id, or `null` if absent. */
  find<T>(collection: string, id: string): Promise<T | null>
}
