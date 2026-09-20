import { Badge, type BadgeWidth } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'

export function FileMissingChip({ width }: { width?: BadgeWidth }) {
  return (
    <Badge variant="err" width={width} className="font-bold">
      <ChipDot />
      ファイル不在
    </Badge>
  )
}
