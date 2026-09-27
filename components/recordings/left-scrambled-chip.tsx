import { LEFT_SCRAMBLED_IN_FULL } from '@/lib/state-terms'
import { Badge } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'

export function LeftScrambledChip() {
  return (
    <Badge variant="err" className="font-bold">
      <ChipDot />
      {LEFT_SCRAMBLED_IN_FULL}
    </Badge>
  )
}
