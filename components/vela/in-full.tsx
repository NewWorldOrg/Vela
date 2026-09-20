'use client'

import type { ReactElement, ReactNode } from 'react'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export const IN_FULL_WAITS = 200

export function InFull({
  says,
  children,
}: {
  says: ReactNode
  children: ReactElement
}) {
  return (
    <TooltipProvider delayDuration={IN_FULL_WAITS}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          data-slot="in-full"
          className="whitespace-pre-wrap [overflow-wrap:anywhere]"
        >
          {says}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
