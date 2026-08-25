'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Tabs as TabsPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

function Tabs({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        'group/tabs flex gap-2 data-[orientation=horizontal]:flex-col',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Underline tabs. The rule under the list is dashed, and the selected tab is
 * marked with the accent colour, a soft accent surface and a 2px underline —
 * not a solid fill.
 */
const tabsListVariants = cva(
  'group/tabs-list flex w-fit items-center gap-1.5 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col group-data-[orientation=vertical]/tabs:items-stretch',
  {
    variants: {
      variant: {
        line: 'border-b border-dashed border-line group-data-[orientation=vertical]/tabs:border-r group-data-[orientation=vertical]/tabs:border-b-0',
        plain: 'border-none',
      },
    },
    defaultVariants: {
      variant: 'line',
    },
  },
)

function TabsList({
  className,
  variant = 'line',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'tap-target -mb-px rounded-t-md border-b-2 border-transparent px-[13px] pt-1.5 pb-[9px] text-[13px] font-medium whitespace-nowrap text-ink-2 outline-none',
        'transition-[background-color,color,border-color] duration-150 ease-out',
        'hover:bg-surface-2 hover:text-ink focus-visible:shadow-ring',
        'cursor-pointer disabled:cursor-not-allowed disabled:opacity-45',
        'disabled:hover:bg-transparent disabled:hover:text-ink-2',
        'data-[state=active]:border-b-brand data-[state=active]:bg-brand-soft data-[state=active]:font-bold data-[state=active]:text-brand',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
