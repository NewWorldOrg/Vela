import type { ComponentType, ReactNode } from 'react'
import type { Route } from 'next'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { ChevronRightIcon, type IconProps } from '@/components/vela/icons'
import { StatusDot, type StatusTone } from '@/components/vela/status'
import { pressable, still } from '@/components/vela/tactile'

export const HEAD_TONE: Record<StatusTone, string> = {
  ok: 'text-ink',
  warn: 'text-warn-text',
  err: 'text-rec-text',
  off: 'text-ink-2',
}

/** A row of the state: its name over its facts at the left, the state at the right, and an arrow when it leads somewhere. */
export function Part({
  name,
  mark: Mark,
  tone,
  head,
  unit,
  href,
  children,
}: {
  name: string
  mark: ComponentType<IconProps>
  tone: StatusTone
  head: ReactNode
  unit?: string
  href?: Route
  children?: ReactNode
}) {
  const body = (
    <>
      <span className="flex min-w-0 flex-1 items-start gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-sm bg-surface-2 text-ink-2">
          <Mark className="size-4" />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5 pt-[calc(3rem/16)]">
          <span
            data-slot="state-name"
            className="text-[calc(14.5rem/16)] leading-5 font-semibold text-ink"
          >
            {name}
          </span>
          {children && (
            <span className="flex flex-col gap-1 text-sub text-ink-2">
              {children}
            </span>
          )}
        </span>
      </span>
      <span
        data-slot="state-head"
        className={cn(
          'flex shrink-0 items-baseline gap-1.5 self-center tabular-nums',
          HEAD_TONE[tone],
        )}
      >
        {tone !== 'off' && (
          <StatusDot tone={tone} className="size-2 self-center" />
        )}
        <span className="text-heading font-bold">{head}</span>
        {unit && <small className="text-sub text-ink-2">{unit}</small>}
      </span>
      {href ? (
        <ChevronRightIcon className="size-4 shrink-0 self-center text-ink-3" />
      ) : (
        <span className="w-4 shrink-0" />
      )}
    </>
  )

  const skin = cn(
    'relative flex items-start gap-3 px-4 py-3.5 text-ink',
    'before:absolute before:top-0 before:right-0 before:left-[calc(56rem/16)] before:h-px before:bg-hair first:before:hidden',
  )

  return href ? (
    <Link
      href={href}
      data-slot="state-tile"
      data-tone={tone}
      className={cn(
        skin,
        'outline-none hover:bg-surface-2 focus-visible:bg-surface-2 hover:before:hidden [&:hover+*]:before:hidden',
        pressable,
        still,
      )}
    >
      {body}
    </Link>
  ) : (
    <div data-slot="state-tile" data-tone={tone} className={skin}>
      {body}
    </div>
  )
}
