import type { Recording } from '@/repository/recordings'
import { Badge } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'

export function OutcomeChip({ recording: r }: { recording: Recording }) {
  switch (r.outcome) {
    case 'recording':
      return (
        <Badge variant="info" className="font-bold">
          <ChipDot />
          録画中
        </Badge>
      )
    case 'complete':
      return (
        <Badge variant="ok" className="font-bold">
          <ChipDot />
          完全
        </Badge>
      )
    case 'truncated':
      return (
        <Badge variant="warn" className="font-bold">
          <ChipDot />
          尻切れ
        </Badge>
      )
    case 'failed':
      return (
        <Badge variant="err" className="font-bold">
          <ChipDot />
          失敗
        </Badge>
      )
  }
}
