import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function DetailKeyRow({
  label,
  main,
  sub,
  plain,
  action,
}: {
  label: string
  main: ReactNode
  sub?: string
  plain?: boolean
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-3 border-b border-dashed border-line py-[calc(9rem/16)] text-ui last:border-b-0">
      <span className="w-[var(--row-label,132px)] shrink-0 text-note text-ink-3 max-[900px]:w-[calc(110rem/16)] max-[700px]:w-full">
        {label}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn(!plain && 'font-code text-[calc(13rem/16)]')}>
          {main}
        </span>
        {sub && (
          <small className="block text-cap leading-[1.7] text-ink-3">
            {sub}
          </small>
        )}
      </span>
      {action}
    </div>
  )
}
