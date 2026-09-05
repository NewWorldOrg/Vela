import type { EncodeJobStatus } from '@/repository/encode-terms'
import { STALLED_LABEL, STATUS_LABEL } from '@/repository/encode-terms'
import { Badge } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'

export function JobStatusChip({
  status,
  stalled,
}: {
  status: EncodeJobStatus
  stalled?: boolean
}) {
  switch (status) {
    case 'queued':
      return <Badge variant="outline">{STATUS_LABEL.queued}</Badge>
    case 'running':
      return (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <Badge variant="info" className="font-bold">
            <ChipDot />
            {STATUS_LABEL.running}
          </Badge>
          {stalled && (
            <Badge variant="warn" className="font-bold">
              <ChipDot />
              {STALLED_LABEL}
            </Badge>
          )}
        </span>
      )
    case 'completed':
      return (
        <Badge variant="ok" className="font-bold">
          <ChipDot />
          {STATUS_LABEL.completed}
        </Badge>
      )
    case 'failed':
      return (
        <Badge variant="err" className="font-bold">
          <ChipDot />
          {STATUS_LABEL.failed}
        </Badge>
      )
    case 'cancelled':
      return <Badge variant="mute">{STATUS_LABEL.cancelled}</Badge>
  }
}
