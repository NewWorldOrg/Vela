'use client'

import { type ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { formatPlayerTime } from '@/lib/format'
import { watchedShareOf, watchStateOf } from '@/lib/library-days'
import { RECORDING_IN_PROGRESS_TERM } from '@/lib/state-terms'
import type { Recording } from '@/repository/recordings'
import { RecordingThumb } from '@/components/library/recording-thumb'

const GLASS =
  'pointer-events-none absolute z-[1] inline-flex h-5 items-center gap-1 rounded-full bg-[rgba(20,20,22,.6)] px-1.5 font-code text-micro leading-none font-semibold text-white backdrop-blur-md'

/** The line of how far a recording was watched, inside the foot of its picture. */
function WatchedBar({ share }: { share: number | undefined }) {
  if (share === undefined) {
    return null
  }

  return (
    <span
      aria-hidden="true"
      data-slot="watched-bar"
      className="pointer-events-none absolute right-[7px] bottom-1.5 left-[7px] z-[1] h-[3px] overflow-hidden rounded-full bg-white/40"
    >
      <span
        className="block h-full rounded-full bg-accent"
        style={{ width: `${share * 100}%` }}
      />
    </span>
  )
}

/** A recording's picture at 16:9, with its length at the foot, a recording still being made at the head, and how far it was watched. */
export function Picture({
  recording,
  corner = 'rounded-md',
  lengthShown = true,
  watchedShown = true,
  className,
  children,
}: {
  recording: Recording
  corner?: string
  lengthShown?: boolean
  watchedShown?: boolean
  className?: string
  children?: ReactNode
}) {
  const state = watchStateOf(recording)

  return (
    <span
      className={cn(
        'relative block aspect-video overflow-hidden bg-surface-2',
        corner,
        className,
      )}
    >
      <RecordingThumb
        recording={recording}
        className="absolute inset-0 size-full rounded-none"
        pictureClassName="group-hover:scale-[1.04]"
      />
      {recording.outcome === 'recording' && (
        <span className={cn(GLASS, 'top-1.5 left-1.5 font-sans')}>
          <span className="breathes size-1.5 rounded-full bg-rec" />
          {RECORDING_IN_PROGRESS_TERM.label}
        </span>
      )}
      {lengthShown &&
        recording.lengthSec !== undefined &&
        recording.outcome !== 'recording' && (
          <span className={cn(GLASS, 'right-1.5 bottom-1.5')}>
            {formatPlayerTime(recording.lengthSec)}
          </span>
        )}
      {state === 'partway' && <WatchedBar share={watchedShareOf(recording)} />}
      {children}
    </span>
  )
}
