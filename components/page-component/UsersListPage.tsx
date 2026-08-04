'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import UsersListTable from '@/components/users/UsersListTable'
import { useListUrlState } from '@/hooks/useListUrlState'
import { usePerPageLocalStorage } from '@/hooks/usePerPageLocalStorage'
import { dataSource } from '@/lib/dataSource'
import type { ListQuery, Page } from '@/lib/data-source'
import { listUsers, type User } from '@/repository/usersRepository'
import type { PageSize, SortState } from '@/types/dataTable'

const INITIAL_SORT: SortState = { sortKey: 'name', sortDirection: 'asc' }

interface UsersListPageProps {
  initialData: Page<User>
}

/**
 * Client page-component: owns list state (URL-synced page/sort/filter +
 * persisted per-page) and refetches through the repository/data-source seam.
 * The first paint uses the server-provided `initialData`; subsequent changes
 * refetch on the client (here against the in-memory mock, an API later).
 */
export default function UsersListPage({ initialData }: UsersListPageProps) {
  const { page, sort, filters, onPageChange, onSortChange, onFiltersChange } =
    useListUrlState({
      initialSort: INITIAL_SORT,
      filterKeys: ['name'],
      filterChangePush: false,
    })

  const [data, setData] = useState<Page<User>>(initialData)
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async (query: ListQuery) => {
    setLoading(true)
    try {
      setData(await listUsers(dataSource, query))
    } catch (error) {
      // Latent against the in-memory mock, but surfaces real API/DB failures
      // instead of silently leaving stale rows on screen.
      console.error('[UsersListPage] failed to load users', error)
      toast.error('Could not load users. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  const { perPage, setPerPage } = usePerPageLocalStorage({
    defaultPerPage: initialData.perPage as PageSize,
    // If localStorage holds a different per-page than the server default,
    // refetch once on mount with the persisted size.
    onInitialMismatch: () => refetch({ page, perPage, sort, filters }),
  })

  const query = useMemo<ListQuery>(
    () => ({ page, perPage, sort, filters }),
    [page, perPage, sort, filters],
  )

  // Refetch when the query changes. Skip the first run: the server already
  // rendered `initialData` for the initial URL (the per-page mismatch path is
  // handled by usePerPageLocalStorage's onInitialMismatch).
  const isFirst = useRef(true)
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false
      return
    }
    refetch(query)
  }, [query, refetch])

  const onPageSizeChange = useCallback(
    (size: number) => {
      setPerPage(size as PageSize)
      onPageChange(1)
    },
    [setPerPage, onPageChange],
  )

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="relative w-72">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search by name…"
          defaultValue={filters.name ?? ''}
          onChange={(e) => onFiltersChange({ name: e.target.value })}
          aria-label="Search users by name"
        />
      </div>

      <UsersListTable
        data={data.items}
        loading={loading}
        sortState={sort}
        onSortChange={onSortChange}
        pagination={{
          currentPage: data.page,
          lastPage: data.lastPage,
          perPage: data.perPage,
          total: data.total,
        }}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  )
}
