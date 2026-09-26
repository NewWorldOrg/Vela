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
  shot: <ThumbShotIcon className="size-[calc(19rem/16)] text-sky" />,
  pending: <ThumbPendingIcon className="size-[calc(19rem/16)] text-ink-3" />,
  none: <ThumbMissingIcon className="size-[calc(19rem/16)] text-ink-3" />,
  error: <ThumbErrorIcon className="size-[calc(19rem/16)] text-coral" />,
}

export function RecordingThumb({
  recording,
  subTone = 'text-ink-3',
}: {
  recording: Recording
  subTone?: string
}) {
  const [reached, setReached] = useState(true)
  const redrawnAt = useRedrawnThumbnail(recording.id)
  const drawn =
    reached && recording.thumbnailHref !== undefined
      ? redrawnHref(recording.thumbnailHref, redrawnAt)
      : undefined

  return (
    <span
      className={cn(
        'flex h-[calc(52rem/16)] w-[calc(92rem/16)] shrink-0 flex-col items-center justify-center gap-px overflow-hidden rounded-md border',
        recording.thumbnail === 'shot' && 'border-line bg-tint-sky',
        recording.thumbnail === 'pending' &&
          'border-dashed border-line bg-surface-2',
        recording.thumbnail === 'none' &&
          'border-dashed border-line-strong bg-transparent',
        recording.thumbnail === 'error' && 'border-coral-line bg-coral-soft',
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
          className="size-full object-cover"
        />
      ) : (
        <>
          {ART[recording.thumbnail]}
          {recording.thumbnailLabel && (
            <span
              className={cn(
                'text-center text-[calc(9rem/16)] leading-tight',
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
