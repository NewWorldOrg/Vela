import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { PLAYER_PALETTE } from '@/components/recordings/player-palette'

const TONES = {
  gone: 'border-[rgba(236,154,147,.45)] bg-[rgba(236,154,147,.12)] text-[#EC9A93]',
  waiting:
    'border-[rgba(229,186,108,.45)] bg-[rgba(229,186,108,.12)] text-[#E5BA6C]',
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
      style={PLAYER_PALETTE}
      className={cn(
        'rounded-lg border border-line-strong bg-(--pl-bg) px-5 py-[22px] text-center',
        className,
      )}
    >
      <span
        className={cn(
          'mx-auto mb-2.5 flex size-[46px] items-center justify-center rounded-full border',
          TONES[tone],
        )}
      >
        {mark}
      </span>
      <b className="heading block text-[14.5px] text-(--pl-ink)">{title}</b>
      {body && (
        <p className="mx-auto mt-[5px] max-w-[46em] text-sub leading-relaxed text-(--pl-ink-2)">
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
