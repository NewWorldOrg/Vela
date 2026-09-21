import { NOT_YET_IN_THIS_BUILD } from '@/lib/not-yet-in-this-build'
import type { EncodeJobStatus } from '@/repository/encode-terms'
import { STALLED_LABEL, STATUS_LABEL } from '@/repository/encode-terms'
import { Badge } from '@/components/ui/badge'
import {
  StateSay,
  stateColumnFor,
  toneOf,
} from '@/components/recordings/status-cell'
import { ChipDot } from '@/components/vela/status'

type JobTone = 'secondary' | 'info' | 'warn' | 'ok' | 'err' | 'mute'

export const JOB_STATUS_COLUMN = stateColumnFor([
  ...Object.values(STATUS_LABEL),
  STALLED_LABEL,
])

function wordAndTone(
  status: EncodeJobStatus,
  stalled?: boolean,
): { word: string; tone: JobTone } {
  switch (status) {
    case 'queued':
      return { word: STATUS_LABEL.queued, tone: 'secondary' }
    case 'running':
      return stalled
        ? { word: STALLED_LABEL, tone: 'warn' }
        : { word: STATUS_LABEL.running, tone: 'info' }
    case 'completed':
      return { word: STATUS_LABEL.completed, tone: 'ok' }
    case 'failed':
      return { word: STATUS_LABEL.failed, tone: 'err' }
    case 'cancelled':
      return { word: STATUS_LABEL.cancelled, tone: 'mute' }
    default:
      return { word: NOT_YET_IN_THIS_BUILD, tone: 'mute' }
  }
}

export function JobStatusChip({
  status,
  stalled,
  say = false,
}: {
  status: EncodeJobStatus
  stalled?: boolean
  say?: boolean
}) {
  const { word, tone } = wordAndTone(status, stalled)
  const held =
    status === 'running' && stalled
      ? `${STATUS_LABEL.running} / ${STALLED_LABEL}`
      : undefined

  if (say) {
    return (
      <StateSay tone={toneOf(tone)} bold title={held}>
        {word}
      </StateSay>
    )
  }

  return (
    <Badge variant={tone} title={held} className="font-bold">
      <ChipDot />
      {word}
    </Badge>
  )
}
