import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

const TONES = {
  gone: 'border-(--pl-err)/45 bg-(--pl-err)/12 text-(--pl-err)',
  waiting: 'border-(--pl-warn)/45 bg-(--pl-warn)/12 text-(--pl-warn)',
  quiet: 'border-white/20 bg-white/5 text-(--pl-ink-2)',
} as const

export function PlaybackNotice({
  mark,
  tone = 'quiet',
  title,
  body,
  children,
  className,
}: {
  mark: ReactNode
  tone?: keyof typeof TONES
  title: string
  body?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'rounded-lg border border-line-strong bg-(--pl-bg) px-5 py-[calc(22rem/16)] text-center',
        className,
      )}
    >
      <span
        className={cn(
          'mx-auto mb-2.5 flex size-[calc(46rem/16)] items-center justify-center rounded-full border',
          TONES[tone],
        )}
      >
        {mark}
      </span>
      <b className="heading block text-[calc(14.5rem/16)] text-(--pl-ink)">
        {title}
      </b>
      {body && (
        <p className="mx-auto mt-[calc(5rem/16)] max-w-[46em] text-sub leading-relaxed text-(--pl-ink-2)">
          {body}
        </p>
      )}
      {children && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {children}
        </div>
      )}
    </section>
  )
}
