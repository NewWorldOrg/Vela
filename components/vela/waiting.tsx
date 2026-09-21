import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

export const WAITING_LABEL = '読み込み中'

const ROW_WIDTHS = ['w-[92%]', 'w-[78%]', 'w-[85%]', 'w-[70%]', 'w-[88%]']

export function WaitingRows({
  rows = ROW_WIDTHS.length,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-2.5', className)}>
      {Array.from({ length: rows }, (_, nth) => (
        <Skeleton
          key={nth}
          className={cn('h-[34px]', ROW_WIDTHS[nth % ROW_WIDTHS.length])}
        />
      ))}
    </div>
  )
}

export function WaitingScreen() {
  return (
    <div role="status" aria-label={WAITING_LABEL} className="mt-3.5">
      <Skeleton className="h-[30px] w-[220px]" />
      <Skeleton className="mt-3.5 h-[46px] w-full" />
      <WaitingRows className="mt-3.5" />
    </div>
  )
}
