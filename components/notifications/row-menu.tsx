'use client'

import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreIcon, TrashIcon } from '@/components/vela/icons'

/** The `…` of a row, drawn as the library's row draws it, always in sight since the row has no other way to its actions. */
const MORE_TRIGGER =
  'tap-target inline-grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-ink-2 outline-none transition-[background-color,color] duration-[140ms] ease-toy hover:bg-surface-2 hover:text-ink focus-visible:shadow-ring data-[state=open]:bg-surface-2'

export interface RowAction {
  label: string
  onSelect: () => void
}

/** A row's `…` and the menu it opens: its actions, then a line, then `削除` in the colour of what cannot be undone. */
export function RowMenu({
  name,
  actions,
  onRemove,
  className,
}: {
  name: string
  actions: RowAction[]
  onRemove: () => void
  className?: string
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={`${name} の操作`}
        className={cn(MORE_TRIGGER, className)}
      >
        <MoreIcon className="size-[calc(18rem/16)]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((action) => (
          <DropdownMenuItem key={action.label} onSelect={action.onSelect}>
            {action.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onRemove}>
          <TrashIcon />
          削除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
