import { cn } from '@/lib/utils'
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
