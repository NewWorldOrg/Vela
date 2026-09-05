import { Badge } from '@/components/ui/badge'

export function JobCounts({
  waiting,
  failed,
  className,
}: {
  waiting: number
  failed: number
  className?: string
}) {
  return (
    <div data-slot="job-counts" className={className}>
      <Badge variant="info">待機 {waiting} 本</Badge>
      <Badge variant="err">失敗 {failed} 本</Badge>
    </div>
  )
}
