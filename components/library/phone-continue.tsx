'use client'

import { cn } from '@/lib/utils'
import { minutesLeftOf } from '@/lib/library-days'
import type { Recording } from '@/repository/recordings'
import { GoingOn } from '@/components/library/going-on'
import { Picture } from '@/components/library/picture'

/** The recordings left part-way, across the phone in a row that is sent sideways: each opens where it was left. */
export function PhoneContinue({
  recordings,
  dimmed = false,
}: {
  recordings: Recording[]
  /** While the library is choosing: drawn faint, and nothing in it can be pressed. */
  dimmed?: boolean
}) {
  if (recordings.length === 0) {
    return null
  }

  return (
    <section
      aria-labelledby="library-continue"
      data-slot="phone-continue"
      inert={dimmed}
      className={cn(
        'transition-opacity duration-[140ms] ease-toy',
        dimmed && 'opacity-40',
      )}
    >
      <h2
        id="library-continue"
        className="px-0.5 pt-3 pb-2 text-heading font-bold tracking-[-0.015em] text-ink"
      >
        続きから
      </h2>
      <ul className="-mx-3.5 flex gap-3 overflow-x-auto px-4 pb-1">
        {recordings.map((recording) => {
          const left = minutesLeftOf(recording)

          return (
            <li key={recording.id} className="w-[calc(232rem/16)] shrink-0">
              <GoingOn
                recording={recording}
                still={dimmed}
                className="block text-ink no-underline outline-none focus-visible:shadow-ring"
              >
                <Picture
                  recording={recording}
                  corner="rounded-md"
                  lengthShown={false}
                />
                <span className="mt-2 block truncate text-ui font-bold">
                  {recording.title}
                </span>
                <span className="block text-note text-ink-2">
                  {recording.channel}
                  {left !== undefined && (
                    <>
                      {' · '}残り <span className="font-code">{left}</span> 分
                    </>
                  )}
                </span>
              </GoingOn>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
