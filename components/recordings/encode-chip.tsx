import { cn } from '@/lib/utils'
import { shapeFor } from '@/lib/not-yet-in-this-build'
import { standingWordOf } from '@/lib/encode'
import type { Recording } from '@/repository/recordings'
import type { EncodeStanding } from '@/repository/encode-terms'
import { Badge, type BadgeWidth } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'

const TONE: Record<EncodeStanding, 'info' | 'ok' | 'err' | undefined> = {
  notEncoded: undefined,
  queued: undefined,
  running: 'info',
  completed: 'ok',
  failed: 'err',
}

export function EncodeChip({
  recording: r,
  subTone = 'text-ink-3',
  width,
}: {
  recording: Recording
  subTone?: string
  width?: BadgeWidth
}) {
  const tone = shapeFor(TONE, r.encode, undefined)
  const word = standingWordOf(r.encode, r.encodeWhenRecorded)

  if (!tone) {
    return (
      <Badge
        variant="outline"
        width={width}
        className={cn('border-line', subTone)}
      >
        {word}
      </Badge>
    )
  }

  return (
    <Badge variant={tone} width={width} className="font-bold">
      <ChipDot />
      {word}
    </Badge>
  )
}
