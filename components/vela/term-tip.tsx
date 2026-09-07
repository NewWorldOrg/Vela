'use client'

import type { ReactNode } from 'react'

import type { StateTerm } from '@/lib/state-terms'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function TermTip({
  term,
  children,
}: {
  term: StateTerm
  children: ReactNode
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            data-slot="term-tip"
            tabIndex={0}
            className="inline-flex cursor-help rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent>{term.explanation}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
