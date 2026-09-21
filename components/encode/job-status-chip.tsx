import { NOT_YET_IN_THIS_BUILD } from '@/lib/not-yet-in-this-build'
import type { EncodeJobStatus } from '@/repository/encode-terms'
import { STALLED_LABEL, STATUS_LABEL } from '@/repository/encode-terms'
import { Badge, type BadgeWidth } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'

export function JobStatusChip({
  status,
  stalled,
  width,
}: {
  status: EncodeJobStatus
  stalled?: boolean
  width?: BadgeWidth
}) {
  switch (status) {
    case 'queued':
      return (
        <Badge variant="outline" width={width} className="font-bold">
          <ChipDot />
          {STATUS_LABEL.queued}
        </Badge>
      )
    case 'running':
      return (
        <Badge
          variant={stalled ? 'warn' : 'info'}
          width={width}
          title={
            stalled ? `${STATUS_LABEL.running} / ${STALLED_LABEL}` : undefined
          }
          className="font-bold"
        >
          <ChipDot />
          {stalled ? STALLED_LABEL : STATUS_LABEL.running}
        </Badge>
      )
    case 'completed':
      return (
        <Badge variant="ok" width={width} className="font-bold">
          <ChipDot />
          {STATUS_LABEL.completed}
        </Badge>
      )
    case 'failed':
      return (
        <Badge variant="err" width={width} className="font-bold">
          <ChipDot />
          {STATUS_LABEL.failed}
        </Badge>
      )
    case 'cancelled':
      return (
        <Badge variant="mute" width={width} className="font-bold">
          <ChipDot />
          {STATUS_LABEL.cancelled}
        </Badge>
      )
    default:
      return (
        <Badge variant="mute" width={width} className="font-bold">
          <ChipDot />
          {NOT_YET_IN_THIS_BUILD}
        </Badge>
      )
  }
}
