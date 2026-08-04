'use client'

import DataTable from '@/components/common/DataTable'
import {
  userColumnVisibilityOptions,
  userColumns,
} from '@/components/users/columns'
import type {
  PaginationState,
  SortDirection,
  SortState,
} from '@/types/dataTable'
import type { User } from '@/repository/usersRepository'

interface UsersListTableProps {
  data: User[]
  loading?: boolean
  sortState: SortState
  onSortChange: (sortKey: string, sortDirection: SortDirection) => void
  pagination: PaginationState
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onRowClick?: (user: User) => void
}

/**
 * Feature-layer table: maps `User` rows through the generic DataTable using the
 * shared user column definitions. Holds no state of its own.
 */
export default function UsersListTable({
  data,
  loading,
  sortState,
  onSortChange,
  pagination,
  onPageChange,
  onPageSizeChange,
  onRowClick,
}: UsersListTableProps) {
  return (
    <DataTable
      title="Users"
      data={data}
      columns={userColumns}
      trackBy="id"
      loading={loading}
      sortState={sortState}
      onSortChange={onSortChange}
      pagination={pagination}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      columnVisibilityOptions={userColumnVisibilityOptions}
      storageKey="users"
      onRowClick={onRowClick}
      emptyText="No users match your search."
    />
  )
}
