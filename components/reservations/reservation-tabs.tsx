import Link from 'next/link'

import { cn } from '@/lib/utils'
import { LedgerIcon } from '@/components/vela/icons'

const TABS = [
  { key: 'reservations', label: '予約', href: '/reservations' },
  { key: 'rules', label: 'ルール', href: '/reservations/rules' },
] as const

const LEDGER = {
  key: 'outcomes',
  label: '予約結果台帳',
  href: '/reservations/outcomes',
} as const

export type ReservationTab = (typeof TABS)[number]['key'] | typeof LEDGER.key

const TAB_CLASS =
  'tap-target rounded-full px-3.5 py-1.5 text-ui font-medium text-ink-2 no-underline transition-[background-color,color] duration-150 hover:bg-surface-2 hover:text-ink'

const CURRENT_CLASS = 'bg-brand-soft font-bold text-brand'

export function ReservationTabs({
  current,
  action,
}: {
  current: ReservationTab
  action?: React.ReactNode
}) {
  return (
    <div className="mb-3.5 flex flex-wrap items-center gap-2.5 border-b border-line pb-2.5">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === current ? 'page' : undefined}
          className={cn(TAB_CLASS, t.key === current && CURRENT_CLASS)}
        >
          {t.label}
        </Link>
      ))}
      <span className="h-4 w-px shrink-0 bg-line" />
      <Link
        href={LEDGER.href}
        aria-current={LEDGER.key === current ? 'page' : undefined}
        className={cn(
          TAB_CLASS,
          'inline-flex items-center gap-1.5',
          LEDGER.key === current && CURRENT_CLASS,
        )}
      >
        <LedgerIcon className="size-[15px]" />
        {LEDGER.label}
      </Link>
      {action && <span className="ml-auto">{action}</span>}
    </div>
  )
}
