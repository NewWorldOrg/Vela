'use client'

import { cloneElement, isValidElement, type ReactNode } from 'react'

import { tipTrigger } from '@/lib/in-full'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export const IN_FULL_WAITS = 200

interface Tipped {
  className?: string
  tabIndex?: number
}

export function InFull({
  says,
  alreadyFocusable = false,
  children,
}: {
  says: ReactNode
  alreadyFocusable?: boolean
  children: ReactNode
}) {
  const held = isValidElement<Tipped>(children) ? (
    cloneElement(
      children,
      tipTrigger(children.props.className, alreadyFocusable),
    )
  ) : (
    <span {...tipTrigger(undefined, alreadyFocusable)}>{children}</span>
  )

  return (
    <TooltipProvider delayDuration={IN_FULL_WAITS}>
      <Tooltip>
        <TooltipTrigger asChild>{held}</TooltipTrigger>
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
