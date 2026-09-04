'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'
import { redrawnHref } from '@/lib/thumbnail-redraw'
import { useRedrawnThumbnail } from '@/hooks/useRedrawnThumbnail'
import type { Recording } from '@/repository/recordings'
import {
  ThumbErrorIcon,
  ThumbMissingIcon,
  ThumbPendingIcon,
  ThumbShotIcon,
} from '@/components/vela/icons'

const ART = {
  shot: <ThumbShotIcon className="size-[19px] text-sky" />,
  pending: <ThumbPendingIcon className="size-[19px] text-ink-3" />,
  none: <ThumbMissingIcon className="size-[19px] text-ink-3" />,
  error: <ThumbErrorIcon className="size-[19px] text-coral" />,
}

/**
 * The picture drawn of a recording, where one was drawn.
 *
 * A row whose recording has a picture shows the picture. The drawing beside it
 * is what the other three states have instead, and it is also what a picture
 * that will not load falls back to — a broken image icon in a table of
 * recordings reads as a broken screen rather than as a missing frame.
 */
export function RecordingThumb({
  recording,
  subTone = 'text-ink-3',
}: {
  recording: Recording
  subTone?: string
}) {
  const [reached, setReached] = useState(true)
  // As it stands after the last press of サムネイルを作り直す on the recording:
  // the browser holds the picture for a minute, and the row is where the
  // reader comes back to after pressing it.
  const redrawnAt = useRedrawnThumbnail(recording.id)
  const drawn =
    reached && recording.thumbnailHref !== undefined
      ? redrawnHref(recording.thumbnailHref, redrawnAt)
      : undefined

  return (
    <span
      className={cn(
        'flex h-[52px] w-[92px] shrink-0 flex-col items-center justify-center gap-px overflow-hidden rounded-md border',
        recording.thumbnail === 'shot' && 'border-line bg-tint-sky',
        recording.thumbnail === 'pending' &&
          'border-dashed border-line bg-surface-2',
        recording.thumbnail === 'none' &&
          'border-dashed border-line-strong bg-transparent',
        recording.thumbnail === 'error' && 'border-coral-line bg-coral-soft',
      )}
    >
      {drawn ? (
        // The picture is behind the session, and the optimiser fetches it
        // without one; it is also 92px wide and read once, so there is nothing
        // for the optimiser to save.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={drawn}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setReached(false)}
          className="size-full object-cover"
        />
      ) : (
        <>
          {ART[recording.thumbnail]}
          {recording.thumbnailLabel && (
            <span
              className={cn(
                'text-center text-[9px] leading-tight',
                recording.thumbnail === 'error' ? 'text-coral' : subTone,
              )}
            >
              {recording.thumbnailLabel}
            </span>
          )}
        </>
      )}
    </span>
  )
}
