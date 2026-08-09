'use client'

import { ColumnsIcon } from '@/components/vela/icons'
import type { VisibilityState } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ColumnVisibilityOption } from '@/types/dataTable'

interface DataTableColumnVisibilityProps {
  options: ColumnVisibilityOption[]
  columnVisibility: VisibilityState
  onColumnVisibilityChange: (next: VisibilityState) => void
  onReset: () => void
}

/**
 * Column picker: toggles per-column visibility. `alwaysVisible` columns are
 * excluded. A column counts as visible unless its id maps to `false`.
 */
export default function DataTableColumnVisibility({
  options,
  columnVisibility,
  onColumnVisibilityChange,
  onReset,
}: DataTableColumnVisibilityProps) {
  const toggleable = options.filter((o) => !o.alwaysVisible)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <ColumnsIcon className="size-4" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {toggleable.map((option) => {
          const checked = columnVisibility[option.id] !== false
          return (
            <DropdownMenuCheckboxItem
              key={option.id}
              checked={checked}
              onCheckedChange={(value) =>
                onColumnVisibilityChange({
                  ...columnVisibility,
                  [option.id]: Boolean(value),
                })
              }
              onSelect={(e) => e.preventDefault()}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          )
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onReset}>Reset</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
