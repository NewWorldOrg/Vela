'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  type ColumnDef,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  SortIcon,
} from '@/components/vela/icons'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import DataTableColumnVisibility from '@/components/common/DataTableColumnVisibility'
import {
  PAGE_SIZE_OPTIONS,
  type ColumnVisibilityOption,
  type PaginationState,
  type SortDirection,
  type SortState,
} from '@/types/dataTable'

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  trackBy?: keyof TData | ((row: TData) => string)
  loading?: boolean

  title?: string
  headerActions?: ReactNode

  sortState?: SortState
  onSortChange?: (sortKey: string, sortDirection: SortDirection) => void

  pagination?: PaginationState
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void

  columnVisibilityOptions?: ColumnVisibilityOption[]
  storageKey?: string

  onRowClick?: (row: TData) => void

  emptyText?: string
}

const STORAGE_PREFIX = 'vela-column-visibility-'

function readStoredVisibility(storageKey: string): VisibilityState | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + storageKey)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      Object.values(parsed).every((v) => typeof v === 'boolean')
    ) {
      return parsed as VisibilityState
    }
    return null
  } catch {
    return null
  }
}

function writeStoredVisibility(storageKey: string, state: VisibilityState) {
  try {
    localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(state))
  } catch {
    // localStorage full or unavailable — ignore.
  }
}

/**
 * Derives the initial `VisibilityState` from `columnVisibilityOptions`. Only
 * `defaultVisible: false` columns are added (as `{ [id]: false }`); everything
 * else uses react-table's default (visible).
 */
function deriveDefaultVisibility(
  options?: ColumnVisibilityOption[],
): VisibilityState {
  if (!options) {
    return {}
  }
  const result: VisibilityState = {}
  for (const opt of options) {
    if (opt.alwaysVisible) {
      continue
    }
    if (opt.defaultVisible === false) {
      result[opt.id] = false
    }
  }
  return result
}

export default function DataTable<TData>({
  columns,
  data,
  trackBy,
  loading,
  title,
  headerActions,
  sortState,
  onSortChange,
  pagination,
  onPageChange,
  onPageSizeChange,
  columnVisibilityOptions,
  storageKey,
  onRowClick,
  emptyText = 'No data',
}: DataTableProps<TData>) {
  // 2-pass render to avoid SSR/client hydration mismatch: the first render uses
  // the SSR-equal defaults, then a post-mount effect swaps in the localStorage
  // value. `defaultVisibility` is derived from columnVisibilityOptions so the
  // `defaultVisible` field stays the single source of truth.
  const defaultVisibility = deriveDefaultVisibility(columnVisibilityOptions)
  const [columnVisibility, setColumnVisibility] =
    useState<VisibilityState>(defaultVisibility)

  const didHydrateRef = useRef(false)
  useEffect(() => {
    if (didHydrateRef.current) {
      return
    }
    didHydrateRef.current = true
    if (!storageKey) {
      return
    }
    const stored = readStoredVisibility(storageKey)
    if (stored) {
      setColumnVisibility({ ...defaultVisibility, ...stored })
    }
    // Hydrate once on mount (storageKey is expected to be a stable const).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist on change in an effect (not inside the state updater, which React
  // may double-invoke in StrictMode). Skip the first run so the SSR-default
  // render does not overwrite a stored value before hydration applies it.
  const skipFirstWriteRef = useRef(true)
  useEffect(() => {
    if (skipFirstWriteRef.current) {
      skipFirstWriteRef.current = false
      return
    }
    if (storageKey) {
      writeStoredVisibility(storageKey, columnVisibility)
    }
  }, [columnVisibility, storageKey])

  const resetColumnVisibility = useCallback(() => {
    setColumnVisibility(deriveDefaultVisibility(columnVisibilityOptions))
  }, [columnVisibilityOptions])

  const table = useReactTable({
    data,
    columns,
    pageCount: pagination?.lastPage ?? -1,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  })

  const getRowKey = useCallback(
    (row: TData, index: number): string => {
      if (!trackBy) {
        return String(index)
      }
      if (typeof trackBy === 'function') {
        return trackBy(row)
      }
      return String(row[trackBy])
    },
    [trackBy],
  )

  const colSpan = table.getVisibleLeafColumns().length
  const showHeader = Boolean(title || columnVisibilityOptions || headerActions)

  return (
    <Card className="flex min-h-0 flex-1 flex-col">
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {title}
            {pagination && (
              <Badge variant="secondary" className="text-xs font-normal">
                {pagination.total}
              </Badge>
            )}
          </CardTitle>
          <CardAction>
            <div className="flex items-center gap-2">
              {columnVisibilityOptions && (
                <DataTableColumnVisibility
                  options={columnVisibilityOptions}
                  columnVisibility={columnVisibility}
                  onColumnVisibilityChange={setColumnVisibility}
                  onReset={resetColumnVisibility}
                />
              )}
              {headerActions}
            </div>
          </CardAction>
        </CardHeader>
      )}

      <CardContent className="min-h-0 flex-1 p-0">
        <Table containerClassName="h-full overflow-auto">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta
                  const sortingField = meta?.sortingField
                  const isSortable = !!sortingField && !!onSortChange
                  const isActive = sortState?.sortKey === sortingField
                  const stickyDir = meta?.sticky
                  const stickyOffset = meta?.stickyOffsetPx ?? 0
                  const minWidthPx = meta?.minWidthPx
                  const stickyStyle: CSSProperties | undefined =
                    stickyDir === 'left' || minWidthPx
                      ? {
                          ...(stickyDir === 'left'
                            ? { left: `${stickyOffset}px` }
                            : {}),
                          ...(minWidthPx
                            ? { minWidth: `${minWidthPx}px` }
                            : {}),
                        }
                      : undefined
                  const stickyClass =
                    stickyDir === 'left'
                      ? 'sticky top-0 z-30 bg-surface-2'
                      : 'sticky top-0 z-20 bg-surface-2'

                  return (
                    <TableHead
                      key={header.id}
                      className={stickyClass}
                      style={stickyStyle}
                    >
                      {header.isPlaceholder ? null : isSortable ? (
                        <button
                          type="button"
                          className="tap-target flex items-center gap-1 hover:text-foreground"
                          onClick={() => {
                            const newDirection =
                              isActive && sortState?.sortDirection === 'asc'
                                ? 'desc'
                                : 'asc'
                            onSortChange(sortingField, newDirection)
                          }}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {isActive ? (
                            sortState?.sortDirection === 'asc' ? (
                              <ChevronUpIcon className="size-3.5" />
                            ) : (
                              <ChevronDownIcon className="size-3.5" />
                            )
                          ) : (
                            <SortIcon className="size-3.5 text-muted-foreground" />
                          )}
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="p-0">
                  <div
                    data-testid="datatable-loading"
                    className="sticky left-0 py-8 text-center text-muted-foreground"
                    style={{ width: 'min(100vw, 100%)' }}
                  >
                    Loading…
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="p-0">
                  <div
                    data-testid="datatable-empty"
                    className="sticky left-0 py-8 text-center text-muted-foreground"
                    style={{ width: 'min(100vw, 100%)' }}
                  >
                    {emptyText}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={getRowKey(row.original, index)}
                  className={cn(
                    onRowClick &&
                      'cursor-pointer hover:bg-muted/50 active:bg-muted',
                  )}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? 'button' : undefined}
                  onClick={
                    onRowClick
                      ? (e) => {
                          const target = e.target as HTMLElement
                          const closestInteractive = target.closest(
                            'a, button, input, select, textarea, [data-slot="checkbox"]',
                          )
                          if (
                            closestInteractive &&
                            !closestInteractive.isSameNode(e.currentTarget)
                          ) {
                            return
                          }
                          onRowClick(row.original)
                        }
                      : undefined
                  }
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onRowClick(row.original)
                          }
                        }
                      : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta
                    const truncate = meta?.truncate
                    const rawValue = cell.getValue()
                    const cellTitle =
                      truncate && typeof rawValue === 'string'
                        ? rawValue
                        : undefined
                    const cellStickyDir = meta?.sticky
                    const cellStickyOffset = meta?.stickyOffsetPx ?? 0
                    const cellMinWidth = meta?.minWidthPx
                    const cellClass =
                      [
                        truncate
                          ? 'max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap'
                          : '',
                        cellStickyDir === 'left' ? 'sticky z-10 bg-card' : '',
                      ]
                        .filter(Boolean)
                        .join(' ') || undefined
                    const cellStyle: CSSProperties | undefined =
                      cellStickyDir === 'left' || cellMinWidth
                        ? {
                            ...(cellStickyDir === 'left'
                              ? { left: `${cellStickyOffset}px` }
                              : {}),
                            ...(cellMinWidth
                              ? { minWidth: `${cellMinWidth}px` }
                              : {}),
                          }
                        : undefined
                    return (
                      <TableCell
                        key={cell.id}
                        title={cellTitle}
                        className={cellClass}
                        style={cellStyle}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {pagination && onPageChange && (
        <CardFooter className="justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            {pagination.total} total
          </div>
          <div className="flex items-center gap-2">
            {onPageSizeChange && (
              <Select
                value={String(pagination.perPage)}
                onValueChange={(v) => onPageSizeChange(Number(v))}
              >
                <SelectTrigger size="sm" className="w-28" aria-label="Per page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" side="top" align="end">
                  {PAGE_SIZE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Previous page"
                disabled={pagination.currentPage <= 1}
                onClick={() => onPageChange(pagination.currentPage - 1)}
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <span className="px-2 text-sm">
                {pagination.currentPage} / {pagination.lastPage}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Next page"
                disabled={pagination.currentPage >= pagination.lastPage}
                onClick={() => onPageChange(pagination.currentPage + 1)}
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  )
}
