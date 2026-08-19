'use client'

import { cn } from '@/lib/utils'
import type { Program } from '@/repository/programs'
import { GENRE_CLASS, HOUR_PX } from '@/components/guide/guide-metrics'

export function ProgramCell({
  program: p,
  past,
  selected,
  onSelect,
}: {
  program: Program
  past: boolean
  selected: boolean
  onSelect: (program: Program) => void
}) {
  const height = (p.durationMin / 60) * HOUR_PX
  const size = height < 40 ? 'xs' : height < 72 ? 's' : 'md'

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(p)}
      style={{
        top: `${(p.startMin / 60) * HOUR_PX}px`,
        height: `${height}px`,
      }}
      className={cn(
        'absolute right-px left-px z-[1] overflow-hidden rounded-md border text-left transition-[translate,box-shadow] duration-150 ease-toy hover:z-[2] hover:-translate-x-px hover:-translate-y-px hover:shadow-pop active:translate-x-px active:translate-y-px active:shadow-pop-none',
        GENRE_CLASS[p.genre],
        size === 'md' && 'px-[7px] py-1',
        size === 's' && 'px-[7px] py-0.5',
        size === 'xs' && 'flex items-center px-1.5 py-0',
        past && 'opacity-[.52]',
        selected && 'z-[3] border-brand shadow-pop',
      )}
    >
      {size === 'xs' ? (
        <span className="overflow-hidden text-[10px] leading-tight font-medium text-ellipsis whitespace-nowrap">
          {p.title}
        </span>
      ) : (
        <>
          <span
            className={cn(
              'block leading-snug font-bold text-ink [font-feature-settings:"palt"]',
              size === 'md' ? 'text-sub' : 'text-[11px]',
            )}
          >
            <span className="mr-[5px] font-code text-[10.5px] font-medium text-ink-3 tabular-nums">
              {p.startLabel.slice(3)}
            </span>
            {p.title}
          </span>
          {p.endUndecided && (
            <span className="mt-px block text-[10.8px] leading-normal text-ink-2">
              終了未定
            </span>
          )}
          {size === 'md' && p.description && (
            <span className="mt-px block text-[10.8px] leading-normal text-ink-2">
              {p.description}
            </span>
          )}
        </>
      )}
    </button>
  )
}
