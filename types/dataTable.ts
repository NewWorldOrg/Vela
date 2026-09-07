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

export const PAGE_SIZES = [20, 50, 100, 200] as const

export type PageSize = (typeof PAGE_SIZES)[number]

export const PAGE_SIZE_OPTIONS = PAGE_SIZES.map((n) => ({
  value: String(n),
  label: `${n} / page`,
})) as ReadonlyArray<{ value: `${PageSize}`; label: string }>

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
