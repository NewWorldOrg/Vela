import { Badge } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'

export function FileMissingChip() {
  return (
    <Badge variant="err" className="font-bold">
      <ChipDot />
      ファイル不在
    </Badge>
  )
}
