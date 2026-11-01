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
      <Badge variant="info">待機 {waiting} 件</Badge>
      <Badge variant={failed > 0 ? 'err' : 'info'}>失敗 {failed} 件</Badge>
    </div>
  )
}
