'use client'

import { cloneElement, type ReactElement, type ReactNode } from 'react'

import { tipTrigger } from '@/lib/in-full'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export const IN_FULL_WAITS = 200

export function InFull({
  says,
  alreadyFocusable = false,
  children,
}: {
  says: ReactNode
  alreadyFocusable?: boolean
  children: ReactElement<{ className?: string; tabIndex?: number }>
}) {
  return (
    <TooltipProvider delayDuration={IN_FULL_WAITS}>
      <Tooltip>
        <TooltipTrigger asChild>
          {cloneElement(
            children,
            tipTrigger(children.props.className, alreadyFocusable),
          )}
        </TooltipTrigger>
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
