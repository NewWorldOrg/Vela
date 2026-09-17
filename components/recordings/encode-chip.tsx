import { cn } from '@/lib/utils'
import { shapeFor, wordFor } from '@/lib/not-yet-in-this-build'
import type { Recording } from '@/repository/recordings'
import {
  NOT_ASKED_FOR_LABEL,
  STANDING_LABEL,
  type EncodeStanding,
} from '@/repository/encode-terms'
import { Badge } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'

const TONE: Record<EncodeStanding, 'info' | 'ok' | 'err' | undefined> = {
  notEncoded: undefined,
  queued: undefined,
  running: 'info',
  completed: 'ok',
  failed: 'err',
}

function wordOf(r: Recording): string {
  return r.encode === 'notEncoded' && !r.encodeWhenRecorded
    ? NOT_ASKED_FOR_LABEL
    : wordFor(STANDING_LABEL, r.encode)
}

export function EncodeChip({
  recording: r,
  subTone = 'text-ink-3',
}: {
  recording: Recording
  subTone?: string
}) {
  const tone = shapeFor(TONE, r.encode, undefined)

  if (!tone) {
    return (
      <Badge variant="outline" className={cn('border-line', subTone)}>
        {wordOf(r)}
      </Badge>
    )
  }

  return (
    <Badge variant={tone} className="font-bold">
      <ChipDot />
      {wordOf(r)}
    </Badge>
  )
}
