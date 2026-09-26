import Link from 'next/link'

import { cn } from '@/lib/utils'
import type { QualityWindow } from '@/repository/quality'

export function LinkSegments({
  label,
  items,
  className,
}: {
  label: string
  items: QualityWindow[]
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex gap-0.5 rounded-full bg-surface-2 p-[calc(3rem/16)]',
        className,
      )}
    >
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          aria-current={item.current ? 'page' : undefined}
          className={cn(
            'tap-target cursor-pointer rounded-full px-3.5 py-[calc(5rem/16)] text-sub font-medium whitespace-nowrap text-ink-2 transition-[background-color,color] duration-150 hover:text-ink',
            item.current && 'bg-brand-soft font-bold text-brand',
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  )
}
