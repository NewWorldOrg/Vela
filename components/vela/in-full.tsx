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
  wraps,
  children,
}: {
  says: ReactNode
  alreadyFocusable?: boolean
  wraps?: string
  children: ReactNode
}) {
  const held =
    wraps !== undefined ? (
      <span {...tipTrigger(wraps, alreadyFocusable)}>{children}</span>
    ) : isValidElement<Tipped>(children) ? (
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
