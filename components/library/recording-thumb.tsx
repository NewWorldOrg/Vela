import { cn } from '@/lib/utils'
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

export function RecordingThumb({
  recording,
  subTone = 'text-ink-3',
}: {
  recording: Recording
  subTone?: string
}) {
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
    </span>
  )
}
