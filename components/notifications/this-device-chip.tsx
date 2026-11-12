import { Badge } from '@/components/ui/badge'

export const THIS_DEVICE = 'この端末'

/** The quiet chip on the row of the browser the page is open in. */
export function ThisDeviceChip({ className }: { className?: string }) {
  return <Badge className={className}>{THIS_DEVICE}</Badge>
}
