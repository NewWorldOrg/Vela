import { shapeFor } from '@/lib/not-yet-in-this-build'
import type { Recording, ThumbnailState } from '@/repository/recordings'
import { Badge } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'

const TONE: Record<ThumbnailState, 'ok' | 'err' | undefined> = {
  shot: 'ok',
  pending: undefined,
  none: undefined,
  error: 'err',
}

export function ThumbnailChip({
  recording: r,
  says,
}: {
  recording: Recording
  says: string
}) {
  const tone = shapeFor(TONE, r.thumbnail, undefined)

  if (!tone) {
    return <Badge variant="outline">{says}</Badge>
  }

  return (
    <Badge variant={tone} className="font-bold">
      <ChipDot />
      {says}
    </Badge>
  )
}
