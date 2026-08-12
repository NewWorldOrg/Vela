'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Tables are not boxed in: there is no outer frame, the header row is a
 * `surface-2` band and rows are separated by a dashed rule. Numeric columns
 * should be right-aligned with `font-code tabular-nums`.
 */
function Table({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<'table'> & { containerClassName?: string }) {
  return (
    <div
      data-slot="table-container"
      // The container scrolls when the columns do not fit, so it has to be
      // reachable by keyboard.
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

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child_td]:border-b-0', className)}
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
        'transition-colors duration-150 ease-out hover:bg-surface-2 has-aria-expanded:bg-surface-2 data-[state=selected]:bg-surface-2',
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
        'bg-surface-2 px-[13px] py-[7px] text-left align-middle text-micro font-bold tracking-[0.04em] whitespace-nowrap text-ink-3 first:rounded-l-md last:rounded-r-md [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
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
        'border-b border-dashed border-line px-[13px] py-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
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
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
