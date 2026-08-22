import Link from 'next/link'

import { cn } from '@/lib/utils'

const TABS = [
  { key: 'reservations', label: '予約', href: '/reservations' },
  { key: 'rules', label: 'ルール', href: '/reservations/rules' },
] as const

export function ReservationTabs({
  current,
  action,
}: {
  current: 'reservations' | 'rules'
  action?: React.ReactNode
}) {
  return (
    <div className="mb-3.5 flex flex-wrap items-center gap-2.5 border-b border-line pb-2.5">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === current ? 'page' : undefined}
          className={cn(
            'tap-target rounded-full px-3.5 py-1.5 text-ui font-medium text-ink-2 no-underline transition-[background-color,color] duration-150 hover:bg-surface-2 hover:text-ink',
            t.key === current && 'bg-brand-soft font-bold text-brand',
          )}
        >
          {t.label}
        </Link>
      ))}
      {action && <span className="ml-auto">{action}</span>}
    </div>
  )
}
