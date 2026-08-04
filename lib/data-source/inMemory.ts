import type { SortState } from '@/types/dataTable'
import type { DataSource, ListQuery, Page } from './types'

export interface Collection<T> {
  /** Field name used as the identity for `find()`. */
  idField: string
  records: T[]
}

export type CollectionMap = Record<string, Collection<unknown>>

function getField(record: unknown, key: string): unknown {
  return (record as Record<string, unknown>)[key]
}

function matchesFilters(record: unknown, filters?: Record<string, string>) {
  if (!filters) return true
  return Object.entries(filters).every(([key, value]) => {
    if (value === '') return true
    const field = getField(record, key)
    if (field == null) return false
    return String(field).toLowerCase().includes(value.toLowerCase())
  })
}

function compareBy(sort: SortState) {
  return (a: unknown, b: unknown): number => {
    const av = getField(a, sort.sortKey)
    const bv = getField(b, sort.sortKey)
    let cmp: number
    if (typeof av === 'number' && typeof bv === 'number') {
      cmp = av - bv
    } else {
      cmp = String(av ?? '').localeCompare(String(bv ?? ''))
    }
    return sort.sortDirection === 'asc' ? cmp : -cmp
  }
}

/**
 * In-memory `DataSource` backed by plain object collections. Filtering is a
 * case-insensitive substring match per field; sorting compares numbers
 * numerically and everything else lexically. Suitable as a mock/seed source.
 */
export function createInMemoryDataSource(
  collections: CollectionMap,
): DataSource {
  function requireCollection(name: string): Collection<unknown> {
    const entry = collections[name]
    if (!entry) throw new Error(`Unknown collection: ${name}`)
    return entry
  }

  return {
    async list<T>(collection: string, query: ListQuery): Promise<Page<T>> {
      const entry = requireCollection(collection)
      let rows = entry.records.slice()
      rows = rows.filter((r) => matchesFilters(r, query.filters))
      if (query.sort) rows.sort(compareBy(query.sort))

      const total = rows.length
      const perPage = Math.max(1, query.perPage)
      const lastPage = Math.max(1, Math.ceil(total / perPage))
      const page = Math.min(Math.max(1, query.page), lastPage)
      const start = (page - 1) * perPage
      const items = rows.slice(start, start + perPage) as T[]

      return { items, total, page, perPage, lastPage }
    },

    async find<T>(collection: string, id: string): Promise<T | null> {
      const entry = requireCollection(collection)
      const found = entry.records.find(
        (r) => String(getField(r, entry.idField)) === id,
      )
      return (found as T) ?? null
    },
  }
}
