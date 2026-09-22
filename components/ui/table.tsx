'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

function Table({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<'table'> & { containerClassName?: string }) {
  return (
    <div
      data-slot="table-container"
      tabIndex={0}
      className={cn(
        'relative w-full overflow-x-auto outline-none focus-visible:shadow-ring',
        containerClassName,
      )}
    >
      <table
        data-slot="table"
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
  return <thead data-slot="table-header" className={cn(className)} {...props} />
}

export const READABLE_LINE = 'max-w-[calc(880rem/16)]'

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
      data-slot="table-body"
      className={cn('rows-arrive [&_tr:last-child_td]:border-b-0', className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
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
      data-slot="table-head"
      className={cn(
        'border-b border-line bg-bg px-[calc(13rem/16)] py-[calc(7rem/16)] text-left align-middle text-micro font-bold tracking-[0.04em] whitespace-nowrap text-ink-3 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[calc(2rem/16)]',
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
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

export {
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
