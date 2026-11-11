import { Badge } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/chip-dot'

export function FileMissingChip() {
  return (
    <Badge variant="err" className="font-bold">
      <ChipDot />
      ファイル不在
    </Badge>
  )
}
