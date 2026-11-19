'use client'

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function SidewaysPanes({
  list,
  detail,
  detailLabel,
  className,
}: {
  list: ReactNode
  detail: ReactNode
  detailLabel: string
  className?: string
}) {
  return (
    <div
      data-slot="sideways-panes"
      data-sideways-panes=""
      className={cn(
        '-mx-5 flex min-h-0 flex-1 border-t border-line',
        className,
      )}
    >
      <div
        data-pane="list"
        className="flex min-h-0 shrink-0 basis-[56%] flex-col overflow-y-auto overscroll-contain border-r border-line pb-(--safe-bottom)"
      >
        {list}
      </div>
      <section
        aria-label={detailLabel}
        data-pane="detail"
        className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-surface px-5 pt-4 pb-[calc(var(--safe-bottom)+16rem/16)]"
      >
        {detail}
      </section>
    </div>
  )
}
