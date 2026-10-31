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
  shot: <ThumbShotIcon className="size-[calc(19rem/16)]" />,
  pending: <ThumbPendingIcon className="size-[calc(19rem/16)]" />,
  none: <ThumbMissingIcon className="size-[calc(19rem/16)]" />,
  error: <ThumbErrorIcon className="size-[calc(19rem/16)]" />,
}

/** A recording's picture, or where it has none yet the mark of why, on the quiet ground of a picture still to come. */
export function RecordingThumb({
  recording,
  className,
  pictureClassName,
}: {
  recording: Recording
  className?: string
  /** Laid on the picture itself, so it can grow under a pointer without its frame. */
  pictureClassName?: string
}) {
  const [reached, setReached] = useState(true)
  const redrawnAt = useRedrawnThumbnail(recording.id)
  const drawn =
    reached && recording.thumbnailHref !== undefined
      ? redrawnHref(recording.thumbnailHref, redrawnAt)
      : undefined

  return (
    <span
      data-thumbnail={recording.thumbnail}
      className={cn(
        'flex h-[calc(54rem/16)] w-[calc(96rem/16)] shrink-0 flex-col items-center justify-center gap-px overflow-hidden rounded-sm bg-surface-2 text-ink-2',
        recording.thumbnail === 'error' && 'bg-accent-soft text-acc-text',
        className,
      )}
    >
      {drawn ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={drawn}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setReached(false)}
          className={cn(
            'size-full object-cover transition-transform duration-[160ms] ease-toy',
            pictureClassName,
          )}
        />
      ) : (
        <>
          {ART[recording.thumbnail]}
          {recording.thumbnailLabel && (
            <span className="text-center text-[calc(9rem/16)] leading-tight">
              {recording.thumbnailLabel}
            </span>
          )}
        </>
      )}
    </span>
  )
}
