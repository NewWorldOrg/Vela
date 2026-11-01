'use client'

import Link from 'next/link'

import { cn } from '@/lib/utils'
import { LedgerIcon } from '@/components/vela/icons'
import { PhoneBarTools } from '@/components/vela/phone-bar-tools'
import { usePhoneOnItsSide } from '@/hooks/usePhone'

const TABS = [
  { key: 'reservations', label: '予約', href: '/reservations' },
  { key: 'rules', label: 'ルール', href: '/reservations/rules' },
] as const

const LEDGER = {
  key: 'outcomes',
  label: '失敗台帳',
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
  const sideways = usePhoneOnItsSide()

  if (sideways) {
    return (
      <PhoneBarTools>
        <nav
          aria-label="予約の種類"
          data-slot="reservation-tabs-in-the-bar"
          className="-order-1 mr-auto flex h-11 items-center gap-0.5 rounded-full bg-surface-2 p-1"
        >
          {[...TABS, LEDGER].map((t) => (
            <Link
              key={t.key}
              href={t.href}
              aria-current={t.key === current ? 'page' : undefined}
              className={cn(
                TAB_CLASS,
                'flex h-9 items-center px-4 py-0 hover:bg-surface',
                t.key === current &&
                  'border border-brand-line ' + CURRENT_CLASS,
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </PhoneBarTools>
    )
  }

  return (
    <div className="mb-3.5 flex flex-wrap items-center gap-2.5 border-b border-line pt-1 pb-2.5">
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
        <LedgerIcon className="size-[calc(15rem/16)]" />
        {LEDGER.label}
      </Link>
      {action && <span className="ml-auto">{action}</span>}
    </div>
  )
}
