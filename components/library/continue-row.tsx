'use client'

import { cn } from '@/lib/utils'
import { minutesLeftOf } from '@/lib/library-days'
import type { Recording } from '@/repository/recordings'
import { PlayIcon } from '@/components/vela/icons'
import { GoingOn } from '@/components/library/going-on'
import { Picture } from '@/components/library/picture'

const SHELF_HEADING =
  'text-heading leading-[calc(22rem/16)] font-bold tracking-[-0.015em] text-ink'

/** The recordings left part-way, in one row: as many as the width holds, each going on from where it was left. Over the table the row is compact, its pictures small and its titles on one line. */
export function ContinueRow({
  recordings,
  compact = false,
  dimmed = false,
}: {
  recordings: Recording[]
  compact?: boolean
  /** While the library is choosing: drawn faint, and nothing in it can be pressed. */
  dimmed?: boolean
}) {
  if (recordings.length === 0) {
    return null
  }

  return (
    <section
      aria-labelledby="library-continue"
      data-slot="continue-row"
      inert={dimmed}
      className={cn(
        'transition-opacity duration-[140ms] ease-toy',
        dimmed && 'opacity-40',
      )}
    >
      <h2 id="library-continue" className={SHELF_HEADING}>
        続きから
      </h2>
      <ul className="mt-2.5 grid grid-cols-2 gap-4 max-[999px]:[&>li:nth-child(n+3)]:hidden min-[1000px]:grid-cols-3 max-[1299px]:[&>li:nth-child(n+4)]:hidden min-[1300px]:grid-cols-4 [&>li:nth-child(n+5)]:hidden">
        {recordings.map((recording) => {
          const left = minutesLeftOf(recording)

          return (
            <li key={recording.id} className="min-w-0">
              <GoingOn
                recording={recording}
                still={dimmed}
                className={cn(
                  'group -m-1.5 grid items-center gap-3 rounded-lg p-1.5 text-ink no-underline outline-none transition-[background-color] duration-[140ms] ease-toy hover:bg-surface focus-visible:shadow-ring',
                  compact
                    ? 'grid-cols-[calc(96rem/16)_minmax(0,1fr)]'
                    : 'grid-cols-[calc(148rem/16)_minmax(0,1fr)]',
                )}
              >
                <Picture
                  recording={recording}
                  corner="rounded-sm"
                  lengthShown={false}
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 z-[1] grid place-items-center bg-black/18 opacity-0 transition-opacity duration-[140ms] ease-toy group-hover:opacity-100 group-focus-visible:opacity-100"
                  >
                    <span
                      className={cn(
                        'grid place-items-center rounded-full bg-white/95 text-[#111] [&_svg]:ml-0.5 [&_svg]:fill-current',
                        compact
                          ? 'size-7 [&_svg]:size-3'
                          : 'size-[calc(34rem/16)] [&_svg]:size-3.5',
                      )}
                    >
                      <PlayIcon />
                    </span>
                  </span>
                </Picture>
                <span className="min-w-0">
                  <span
                    className={cn(
                      'text-body leading-[calc(19rem/16)] font-semibold tracking-[-0.008em]',
                      compact ? 'block truncate' : 'line-clamp-2',
                    )}
                  >
                    {recording.title}
                  </span>
                  <span className="mt-[3px] block truncate text-sub text-ink-2">
                    {recording.channel}
                    {left !== undefined && (
                      <>
                        {' · '}残り <span className="font-code">{left}</span> 分
                      </>
                    )}
                  </span>
                </span>
              </GoingOn>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
