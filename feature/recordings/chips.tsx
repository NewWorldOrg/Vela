import { cn } from '@/lib/utils'
import type { Recording } from '@/repository/recordings'
import { Badge } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'

export function FileMissingChip({ className }: { className?: string }) {
  return (
    <Badge variant="err" className={cn('mt-[3px] font-bold', className)}>
      <ChipDot />
      ファイル不在
    </Badge>
  )
}

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

export function QualityChip({
  recording: r,
  withDetail,
  subTone = 'text-ink-3',
}: {
  recording: Recording
  withDetail?: boolean
  subTone?: string
}) {
  if (!r.quality.measured) {
    return (
      <>
        <Badge variant="outline">未計測</Badge>
        {withDetail && r.quality.detail && (
          <span
            className={cn(
              'mt-[3px] block text-[10.5px] leading-relaxed',
              subTone,
            )}
          >
            {r.quality.detail}
          </span>
        )}
      </>
    )
  }
  const variant =
    r.quality.level === 'good'
      ? 'ok'
      : r.quality.level === 'warn'
        ? 'warn'
        : 'err'
  const label =
    r.quality.level === 'good'
      ? '良好'
      : r.quality.level === 'warn'
        ? '警告水準'
        : '視聴不可の恐れ'
  return (
    <>
      <Badge variant={variant} className="font-bold">
        <ChipDot />
        {label}
      </Badge>
      {withDetail && r.quality.detail && (
        <span
          className={cn(
            'mt-[3px] block font-code text-[10.5px] leading-relaxed',
            subTone,
          )}
        >
          {r.quality.detail}
        </span>
      )}
    </>
  )
}

export function EncodeChip({
  recording: r,
  subTone = 'text-ink-3',
}: {
  recording: Recording
  subTone?: string
}) {
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
