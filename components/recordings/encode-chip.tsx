import { cn } from '@/lib/utils'
import type { Recording } from '@/repository/recordings'
import { Badge } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'

export function EncodeChip({
  recording: r,
  subTone = 'text-ink-3',
}: {
  recording: Recording
  subTone?: string
}) {
  if (!r.encode) {
    return null
  }

  switch (r.encode.status) {
    case 'none':
      return (
        <Badge variant="outline" className={cn('border-line', subTone)}>
          未エンコード
        </Badge>
      )
    case 'waiting':
      return (
        <Badge variant="outline" className={cn('border-line', subTone)}>
          待機中
        </Badge>
      )
    case 'running':
      return (
        <Badge variant="info" className="font-bold">
          <ChipDot />
          実行中 <span className="font-code">{r.encode.progress}%</span>
        </Badge>
      )
    case 'done':
      return (
        <Badge variant="ok" className="font-bold">
          <ChipDot />
          完了
        </Badge>
      )
    case 'failed':
      return (
        <>
          <Badge variant="err" className="font-bold">
            <ChipDot />
            失敗
          </Badge>
          {r.encode.reason && (
            <span
              className={cn(
                'mt-[3px] block text-[10.5px] leading-relaxed',
                subTone,
              )}
            >
              {r.encode.reason}
            </span>
          )}
        </>
      )
  }
}
