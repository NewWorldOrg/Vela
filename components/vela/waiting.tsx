import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

export const WAITING_LABEL = '読み込み中'

export function waitsWhile(waiting: boolean): {
  inert: true | undefined
  className: string
} {
  return {
    inert: waiting || undefined,
    className: cn('transition-opacity duration-150', waiting && 'opacity-60'),
  }
}

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
          className={cn(
            'h-[calc(34rem/16)]',
            ROW_WIDTHS[nth % ROW_WIDTHS.length],
          )}
        />
      ))}
    </div>
  )
}
