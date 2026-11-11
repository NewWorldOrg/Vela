import { Badge } from '@/components/ui/badge'
import { pillWidthFor } from '@/components/recordings/status-cell'

export const ABLE: readonly string[] = ['有効', '無効']

export function AbleSay({ able }: { able: boolean }) {
  return (
    <Badge variant={able ? 'ok' : 'mute'} style={{ width: pillWidthFor(ABLE) }}>
      {able ? ABLE[0] : ABLE[1]}
    </Badge>
  )
}
