import type { RowData } from '@tanstack/react-table'

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    /** When set, the header is a sort button driven by this field key. */
    sortingField?: string
    /** Truncate long cell text to max-w-[200px] with a title tooltip. */
    truncate?: boolean
    /** `'left'` pins the column to the left edge during horizontal scroll. */
    sticky?: 'left'
    /** Minimum column width (px), applied as `style.minWidth`. */
    minWidthPx?: number
    /** Left offset (px) for a sticky-left column (to stack multiple). */
    stickyOffsetPx?: number
  }
}
