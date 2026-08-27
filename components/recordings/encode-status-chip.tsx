import type { RecordingDetail } from '@/repository/recordings'
import { Badge } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'

export function EncodeStatusChip({ detail: d }: { detail: RecordingDetail }) {
  if (!d.encode) {
    return null
  }

  const map = {
    none: (
      <Badge variant="mute" className="font-bold">
        <ChipDot />
        未エンコード
      </Badge>
    ),
    waiting: (
      <Badge variant="info" className="font-bold">
        <ChipDot />
        待機中
      </Badge>
    ),
    running: (
      <Badge variant="info" className="font-bold">
        <ChipDot />
        実行中
      </Badge>
    ),
    done: (
      <Badge variant="ok" className="font-bold">
        <ChipDot />
        完了
      </Badge>
    ),
    failed: (
      <Badge variant="err" className="font-bold">
        <ChipDot />
        失敗
      </Badge>
    ),
  } as const
  return map[d.encode.status]
}
