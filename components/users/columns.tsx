import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import type { ColumnVisibilityOption } from '@/types/dataTable'
import type { User, UserStatus } from '@/repository/usersRepository'

const STATUS_STYLES: Record<UserStatus, string> = {
  active: 'border-transparent bg-success text-success-foreground',
  invited: 'border-transparent bg-info text-info-foreground',
  suspended: 'border-transparent bg-warning text-warning-foreground',
}

export const userColumns: ColumnDef<User, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ getValue }) => (
      <span className="font-medium">{String(getValue())}</span>
    ),
    meta: { sticky: 'left', minWidthPx: 180, sortingField: 'name' },
  },
  {
    accessorKey: 'email',
    header: 'Email',
    meta: { minWidthPx: 260, truncate: true },
  },
  {
    accessorKey: 'role',
    header: 'Role',
    meta: { minWidthPx: 120, sortingField: 'role' },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => {
      const status = getValue() as UserStatus
      return <Badge className={STATUS_STYLES[status]}>{status}</Badge>
    },
    meta: { minWidthPx: 130, sortingField: 'status' },
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    meta: { minWidthPx: 140, sortingField: 'createdAt' },
  },
]

export const userColumnVisibilityOptions: ColumnVisibilityOption[] = [
  { id: 'name', label: 'Name', alwaysVisible: true },
  { id: 'email', label: 'Email' },
  { id: 'role', label: 'Role' },
  { id: 'status', label: 'Status' },
  { id: 'createdAt', label: 'Created' },
]
