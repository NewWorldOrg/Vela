import type { RowData } from '@tanstack/react-table'

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    sortingField?: string
    truncate?: boolean
    sticky?: 'left'
    minWidthPx?: number
    stickyOffsetPx?: number
  }
}
