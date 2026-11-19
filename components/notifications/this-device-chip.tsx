import { Badge } from '@/components/ui/badge'

export const THIS_DEVICE = 'この端末'

export function ThisDeviceChip({ className }: { className?: string }) {
  return <Badge className={className}>{THIS_DEVICE}</Badge>
}
