'use client'

import type { ReactNode } from 'react'

import type { StateTerm } from '@/lib/state-terms'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

/**
 * A state word whose meaning here is narrower than the everyday reading of the
 * same word, with that meaning one hover — or one tab stop — away. It goes on
 * those words only: a bubble over a word that says itself is noise, and noise
 * is what teaches a reader to stop reading the bubbles that are not.
 *
 * The wrapper is what the bubble hangs off rather than the chip itself, so a
 * chip stays a plain span and the pointer probe still reads nothing pressable
 * here — this is a word to read, not a control to press, which is why the
 * pointer says `help` and not `pointer`.
 */
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
