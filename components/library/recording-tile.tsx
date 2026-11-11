'use client'

import { useState, type PointerEvent, type ReactNode } from 'react'
import type { Route } from 'next'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { watchStateOf } from '@/lib/library-days'
import type { Recording } from '@/repository/recordings'
import { InlineAlert } from '@/components/vela/inline-alert'
import { PickMark } from '@/components/library/pick-mark'
import { PickShade } from '@/components/library/pick-shade'
import { PickStart, SHOWN_AT_REST } from '@/components/library/pick-start'
import type { Picking, PickStarting } from '@/components/library/library-cards'
import { Picture } from '@/components/library/picture'

/** Whether the pointer rests on a recording, and the handlers that follow it; only a mouse's pointer counts. */
export function usePointerResting() {
  const [resting, setResting] = useState(false)

  return {
    resting,
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'mouse') {
        setResting(true)
      }
    },
    onPointerLeave: () => setResting(false),
  }
}

function recordingHref(id: string): Route {
  return `/recordings/${id}` as Route
}

/** The accent's dot before the title of a recording nobody has watched. */
function UnwatchedDot() {
  return (
    <span
      data-slot="unwatched-dot"
      className="size-1.5 shrink-0 rounded-full bg-accent"
    >
      <span className="sr-only">未視聴</span>
    </span>
  )
}

/** The press a tile gives: open the recording, or while choosing, take it in or leave it out. */
function TilePress({
  recording,
  picking,
  className,
  children,
}: {
  recording: Recording
  picking?: Picking
  className?: string
  children: ReactNode
}) {
  const press = cn(
    'block min-w-0 rounded-md text-ink no-underline outline-none focus-visible:shadow-ring',
    className,
  )

  if (picking) {
    const taken = picking.picked.has(recording.id)

    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={taken}
        aria-label={`${recording.title} を選ぶ`}
        onClick={(event) => picking.onPick(recording.id, event.shiftKey)}
        className={cn(press, 'w-full cursor-pointer text-left select-none')}
      >
        {children}
      </button>
    )
  }

  return (
    <Link href={recordingHref(recording.id)} className={press}>
      {children}
    </Link>
  )
}

/** A recording in the grid: its picture, its title after the dot of one nobody has watched, and a line under it. On a mouse's screen the check comes up on its picture under the pointer. */
export function RecordingTile({
  recording,
  title = recording.title,
  meta,
  picking,
  onPickStart,
}: {
  recording: Recording
  title?: string
  meta: string
  picking?: Picking
  onPickStart?: PickStarting
}) {
  const state = watchStateOf(recording)
  const taken = picking?.picked.has(recording.id) ?? false
  const { resting, ...following } = usePointerResting()
  const startable = !picking && onPickStart !== undefined

  return (
    <div
      {...(startable ? following : {})}
      data-resting={(startable && resting) || undefined}
      className="group group/pick relative min-w-0"
    >
      <TilePress recording={recording} picking={picking}>
        <Picture
          recording={recording}
          className={cn(
            'transition-shadow duration-[140ms] ease-toy',
            taken &&
              'shadow-[0_0_0_2px_var(--bg),0_0_0_4.5px_var(--accent-fill)]',
          )}
        >
          {picking && (
            <>
              <PickShade />
              <PickMark taken={taken} size="tile" />
            </>
          )}
          {startable && <PickShade className={SHOWN_AT_REST} />}
        </Picture>
        <span
          data-watch={state}
          className={cn(
            'mt-2 flex items-center gap-1.5 text-ui leading-[calc(18rem/16)] font-semibold tracking-[-0.008em]',
            state === 'watched' ? 'text-ink-2' : 'text-ink',
          )}
        >
          {state === 'unwatched' && <UnwatchedDot />}
          <span className="min-w-0 truncate">{title}</span>
        </span>
        <span className="mt-0.5 block truncate text-note text-ink-2">
          {meta}
        </span>
        {picking?.said?.has(recording.id) && (
          <InlineAlert tone="warn" className="mt-1.5">
            {picking.said.get(recording.id)}
          </InlineAlert>
        )}
      </TilePress>
      {startable && (
        <PickStart
          title={recording.title}
          size="tile"
          onStart={() => onPickStart(recording.id)}
        />
      )}
    </div>
  )
}
