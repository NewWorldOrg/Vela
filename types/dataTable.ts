/**
 * Shared types for list screens and the generic DataTable.
 *
 * The `@tanstack/react-table` `ColumnMeta` augmentation lives in
 * `types/reactTable.d.ts` (added alongside the DataTable) so this file has no
 * runtime-table dependency.
 */

export type SortDirection = 'asc' | 'desc'

export interface SortState {
  sortKey: string
  sortDirection: SortDirection
}

export interface PaginationState {
  currentPage: number
  lastPage: number
  perPage: number
  total: number
}

/**
 * Per-page (page size) candidates. `PAGE_SIZES` is the single source of truth:
 * the union type, the Select options, and the localStorage allow-list are all
 * derived from it.
 */
export const PAGE_SIZES = [20, 50, 100, 200] as const

export type PageSize = (typeof PAGE_SIZES)[number]

export const PAGE_SIZE_OPTIONS = PAGE_SIZES.map((n) => ({
  value: String(n),
  label: `${n} / page`,
})) as ReadonlyArray<{ value: `${PageSize}`; label: string }>

/**
 * Column-picker option. The discriminated union rules out the contradictory
 * `{ alwaysVisible: true, defaultVisible: false }` at compile time.
 *
 * - `alwaysVisible: true` columns are always shown and excluded from the
 *   picker; they cannot also set `defaultVisible`.
 * - Otherwise `defaultVisible: false` starts the column hidden (opt-in via the
 *   picker). Defaults to visible.
 */
export type ColumnVisibilityOption =
  | {
      id: string
      label: string
      alwaysVisible: true
    }
  | {
      id: string
      label: string
      alwaysVisible?: false
      defaultVisible?: boolean
    }
