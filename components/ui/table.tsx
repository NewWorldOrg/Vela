'use client'

import * as React from 'react'

import { useArrived } from '@/hooks/useArrived'

import { cn } from '@/lib/utils'
import { waitsWhile } from '@/components/vela/waiting'

function Table({
  className,
  containerClassName,
  waiting = false,
  cards = false,
  ...props
}: React.ComponentProps<'table'> & {
  containerClassName?: string
  waiting?: boolean
  cards?: boolean
}) {
  const wait = waitsWhile(waiting)

  return (
    <div
      data-slot="table-container"
      tabIndex={0}
      inert={wait.inert}
      className={cn(
        'relative w-full overflow-x-auto rounded-xl bg-surface outline-none focus-visible:shadow-ring',
        wait.className,
        containerClassName,
      )}
    >
      <table
        role="table"
        data-slot="table"
        data-cards={cards ? '' : undefined}
        className={cn(
          'w-full caption-bottom border-separate border-spacing-0 text-ui',
          className,
        )}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      role="rowgroup"
      data-slot="table-header"
      className={cn(className)}
      {...props}
    />
  )
}

export const READABLE_LINE = 'max-w-[calc(880rem/16)]'

/**
 * Where a cell goes when its table, marked `data-cards`, lays each row as a card on a phone:
 * `select` the row's checkbox at the card's left, `end` a fold or a way to the detail at its top
 * right, `lead` the name across the first line, `meta` a value that says what it is (a channel, a
 * date, a length, a size) on the next, `field` a value read with its column's name after them,
 * and `actions` the row's buttons on the last. A cell with none takes the card's whole width.
 */
export type CardPlace = 'select' | 'end' | 'lead' | 'meta' | 'field' | 'actions'

export function cardPlace(
  place: CardPlace,
  label?: string,
): { 'data-card': CardPlace; 'data-label'?: string } {
  return label === undefined
    ? { 'data-card': place }
    : { 'data-card': place, 'data-label': label }
}

function TableColumns({ widths }: { widths: (string | undefined)[] }) {
  return (
    <colgroup>
      {widths.map((width, nth) => (
        <col key={nth} style={width === undefined ? undefined : { width }} />
      ))}
    </colgroup>
  )
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      role="rowgroup"
      {...useArrived()}
      data-slot="table-body"
      className={cn('rows-arrive [&_tr:last-child_td]:border-b-0', className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      role="rowgroup"
      data-slot="table-footer"
      className={cn(
        'font-medium [&_td]:border-t [&_td]:border-line',
        className,
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      role="row"
      data-slot="table-row"
      className={cn(
        'transition-colors duration-150 ease-out data-[state=selected]:shadow-[inset_3px_0_0_0_var(--color-brand)]',
        className,
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      role="columnheader"
      data-slot="table-head"
      className={cn(
        'border-b border-line bg-surface px-[calc(13rem/16)] py-[calc(7rem/16)] text-left align-middle text-micro font-bold tracking-[0.04em] whitespace-nowrap text-ink-3 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[calc(2rem/16)]',
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      role="cell"
      data-slot="table-cell"
      className={cn(
        'border-b border-dashed border-line px-[calc(13rem/16)] py-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[calc(2rem/16)]',
        className,
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('mt-4 text-note text-ink-3', className)}
      {...props}
    />
  )
}

/** The checkbox over every shown row, with the words that say so where the table is a list of cards. */
function SelectEvery({ children }: { children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-4">
      {children}
      <span className="text-sub font-medium tracking-normal text-ink-2 min-[600px]:hidden">
        すべて選ぶ
      </span>
    </label>
  )
}

export {
  SelectEvery,
  Table,
  TableColumns,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
