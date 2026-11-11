import type { ReactNode } from 'react'

import type { StatusLine, StatusTone } from '@/repository/tuners'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { InFull } from '@/components/vela/in-full'
import { ChipDot } from '@/components/vela/chip-dot'
import { tipBoxOf } from '@/components/recordings/status-cell'

const CHIP_VARIANT: Record<
  Exclude<StatusTone, 'plain'>,
  'recording' | 'ok' | 'err' | 'warn'
> = {
  ok: 'ok',
  rec: 'recording',
  err: 'err',
  warn: 'warn',
}

/** One line of a hardware group: what it is at the left, how it stands in the middle, its switches at the right. */
export function HardwareLine({
  id,
  title,
  code = false,
  sub,
  status,
  why,
  controls,
}: {
  id?: string
  title: string
  code?: boolean
  sub?: string
  status: StatusLine
  why?: string
  controls?: ReactNode
}) {
  return (
    <div
      id={id}
      data-slot="hardware-line"
      className={cn(
        '@container/line relative',
        'before:absolute before:top-0 before:right-0 before:left-4 before:h-px before:bg-hair first:before:hidden',
      )}
    >
      <div
        className={cn(
          'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3',
          '@[36rem]/line:grid-cols-[minmax(0,1fr)_calc(200rem/16)_calc(148rem/16)]',
          '@[48rem]/line:grid-cols-[minmax(0,1fr)_calc(240rem/16)_calc(148rem/16)]',
        )}
      >
        <div className="col-span-2 min-w-0 @[36rem]/line:col-span-1">
          <p
            className={cn(
              'truncate text-[calc(14.5rem/16)] leading-5 font-medium text-ink',
              code && 'font-code text-ui',
            )}
          >
            {title}
          </p>
          {sub && (
            <p
              title={sub}
              className="mt-0.5 text-sub leading-[1.45] break-words text-ink-2 @[36rem]/line:truncate"
            >
              {sub}
            </p>
          )}
        </div>
        <div className="col-start-1 row-start-2 min-w-0 @[36rem]/line:col-start-2 @[36rem]/line:row-start-1">
          <StatusSaid status={status} why={why} />
        </div>
        <div className="col-start-2 row-start-2 flex items-center justify-end gap-3 @[36rem]/line:col-start-3 @[36rem]/line:row-start-1">
          {controls}
        </div>
      </div>
    </div>
  )
}

/** A state as plain words, or as a chip when it asks for a hand, with since or until when beside or under it. */
export function StatusSaid({
  status,
  why,
}: {
  status: StatusLine
  why?: string
}) {
  const word =
    status.tone === 'plain' ? (
      <span className="text-ui text-ink">{status.word}</span>
    ) : (
      <Badge variant={CHIP_VARIANT[status.tone]} className="font-bold">
        {(status.tone === 'rec' || status.tone === 'ok') && <ChipDot />}
        {status.word}
      </Badge>
    )

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 @[36rem]/line:block @[36rem]/line:[&:has([data-slot=badge])>p]:mt-1">
      {why ? (
        <InFull says={why} wraps={tipBoxOf(status.tone === 'plain')}>
          {word}
        </InFull>
      ) : (
        word
      )}
      {(status.line || status.until) && (
        <p className="flex min-w-0 text-sub leading-[1.45] text-ink-2 tabular-nums @[36rem]/line:mt-0.5">
          {status.line && (
            <span className="min-w-0 truncate">{status.line}</span>
          )}
          {status.line && status.until && (
            <span className="shrink-0 whitespace-pre"> · </span>
          )}
          {status.until && (
            <span
              data-slot="status-until"
              className="shrink-0 whitespace-nowrap"
            >
              {status.until}
            </span>
          )}
        </p>
      )}
    </div>
  )
}
