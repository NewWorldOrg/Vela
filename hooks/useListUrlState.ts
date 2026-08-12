'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { SortDirection, SortState } from '@/types/dataTable'

interface UseListUrlStateOptions {
  initialSort: SortState
  /** Search-param keys treated as filters (read back into `filters`). */
  filterKeys?: string[]
  pageParam?: string
  sortKeyParam?: string
  sortDirParam?: string
  /** Push (history entry) vs replace on page/filter changes. */
  pageChangePush?: boolean
  filterChangePush?: boolean
}

interface UseListUrlStateResult {
  page: number
  sort: SortState
  filters: Record<string, string>
  onPageChange: (page: number) => void
  onSortChange: (sortKey: string, sortDirection: SortDirection) => void
  /** Patch filters; `null`/empty removes a key. Resets to page 1. */
  onFiltersChange: (patch: Record<string, string | null>) => void
}

function parsePage(raw: string | null): number {
  if (raw == null) return 1
  if (!/^[1-9]\d*$/.test(raw)) return 1
  return Number(raw)
}

/**
 * Keeps list state (page, sort, named filters) in the URL as the single source
 * of truth. State is derived from `useSearchParams` via `useMemo` (no
 * `useEffect`), and changes navigate with `scroll: false`.
 */
export function useListUrlState(
  options: UseListUrlStateOptions,
): UseListUrlStateResult {
  const {
    initialSort,
    filterKeys = [],
    pageParam = 'page',
    sortKeyParam = 'sort',
    sortDirParam = 'dir',
    pageChangePush = true,
    filterChangePush = true,
  } = options

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = useMemo(
    () => parsePage(searchParams.get(pageParam)),
    [searchParams, pageParam],
  )

  const sort = useMemo<SortState>(() => {
    const sortKey = searchParams.get(sortKeyParam) ?? initialSort.sortKey
    const dir = searchParams.get(sortDirParam)
    const sortDirection: SortDirection =
      dir === 'asc' || dir === 'desc' ? dir : initialSort.sortDirection
    return { sortKey, sortDirection }
  }, [searchParams, sortKeyParam, sortDirParam, initialSort])

  const filtersKey = filterKeys.join(',')
  const filters = useMemo<Record<string, string>>(() => {
    const result: Record<string, string> = {}
    for (const key of filterKeys) {
      const value = searchParams.get(key)
      if (value != null && value !== '') result[key] = value
    }
    return result
    // filterKeys identity is unstable; key on its joined string instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, filtersKey])

  const buildAndNavigate = useCallback(
    (mutate: (params: URLSearchParams) => void, push: boolean) => {
      const params = new URLSearchParams(searchParams.toString())
      mutate(params)
      const qs = params.toString()
      const href = qs ? `${pathname}?${qs}` : pathname
      const navigate = push ? router.push : router.replace
      navigate(href, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const onPageChange = useCallback(
    (next: number) => {
      buildAndNavigate((params) => {
        if (next > 1) params.set(pageParam, String(next))
        else params.delete(pageParam)
      }, pageChangePush)
    },
    [buildAndNavigate, pageParam, pageChangePush],
  )

  const onSortChange = useCallback(
    (sortKey: string, sortDirection: SortDirection) => {
      buildAndNavigate((params) => {
        params.set(sortKeyParam, sortKey)
        params.set(sortDirParam, sortDirection)
        params.delete(pageParam)
      }, false)
    },
    [buildAndNavigate, sortKeyParam, sortDirParam, pageParam],
  )

  const onFiltersChange = useCallback(
    (patch: Record<string, string | null>) => {
      buildAndNavigate((params) => {
        for (const [key, value] of Object.entries(patch)) {
          if (value == null || value === '') params.delete(key)
          else params.set(key, value)
        }
        params.delete(pageParam)
      }, filterChangePush)
    },
    [buildAndNavigate, pageParam, filterChangePush],
  )

  return { page, sort, filters, onPageChange, onSortChange, onFiltersChange }
}
