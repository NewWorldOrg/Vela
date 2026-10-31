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
        'relative w-full overflow-x-auto rounded-md outline-none focus-visible:shadow-ring',
        wait.className,
        containerClassName,
      )}
    >
      <table
        role="table"
        data-slot="table"
        data-cards={cards ? '' : undefined}
        className={cn(
          'w-full caption-bottom border-separate border-spacing-0 text-sub leading-[1.7]',
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
        'font-medium [&_td]:border-t [&_td]:border-hair',
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
        'transition-colors duration-150 ease-out data-[state=selected]:bg-surface',
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
        'border-b border-hair bg-bg px-[calc(13rem/16)] py-[7px] text-left align-middle text-note font-semibold whitespace-nowrap text-ink-2 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[calc(2rem/16)]',
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
        'border-b border-hair px-[calc(13rem/16)] py-2.5 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[calc(2rem/16)]',
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
      className={cn('mt-4 text-note text-ink-2', className)}
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
