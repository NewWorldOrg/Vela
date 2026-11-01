'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { PhoneBarTools } from '@/components/vela/phone-bar-tools'
import { SegmentedControl } from '@/components/vela/segmented-control'
import { usePhoneOnItsSide } from '@/hooks/usePhone'

const TABS = [
  { key: 'reservations', label: '予約', href: '/reservations' },
  { key: 'rules', label: 'ルール', href: '/reservations/rules' },
  { key: 'outcomes', label: '失敗台帳', href: '/reservations/outcomes' },
] as const

export type ReservationTab = (typeof TABS)[number]['key']

const TITLE_OF: Record<ReservationTab, string> = {
  reservations: '予約',
  rules: 'ルール',
  outcomes: '失敗台帳',
}

/**
 * The head of the reservations, the rules and the ledger: the page's name and its count, the three tabs beside them
 * and the page's own actions at the right end. A phone puts the name in its bar and the tabs across the screen under it,
 * the actions under the tabs; a phone on its side carries the tabs up into its bar.
 */
export function ReservationTabs({
  current,
  count,
  action,
}: {
  current: ReservationTab
  count?: ReactNode
  action?: ReactNode
}) {
  const sideways = usePhoneOnItsSide()

  if (sideways) {
    return (
      <>
        <PhoneBarTools>
          <nav
            aria-label="予約の種類"
            data-slot="reservation-tabs-in-the-bar"
            className="-order-1 mr-auto flex h-11 items-center gap-0.5 rounded-full bg-surface p-1"
          >
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={t.href}
                aria-current={t.key === current ? 'page' : undefined}
                className={cn(
                  'tap-target flex h-9 items-center rounded-full px-4 text-ui font-semibold text-ink-2 no-underline transition-[background-color,color] duration-[140ms] ease-toy hover:text-ink',
                  t.key === current &&
                    'bg-accent-tint text-acc-text hover:text-acc-text',
                )}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </PhoneBarTools>
        {action && (
          <div className="flex flex-wrap items-center justify-end gap-2.5 pb-2 empty:hidden">
            {action}
          </div>
        )}
      </>
    )
  }

  return (
    <div
      data-slot="reservations-head"
      className="flex flex-wrap items-center gap-x-4 gap-y-3 phone:pb-1.5"
    >
      <h1 className="text-display font-bold tracking-[-0.03em] text-ink phone:sr-only">
        {TITLE_OF[current]}
      </h1>
      {count !== undefined && (
        <span className="mt-2.5 mr-1.5 text-sub whitespace-nowrap text-ink-2 phone:hidden">
          {count}
        </span>
      )}
      <SegmentedControl
        aria-label="予約の種類"
        options={TABS.map((t) => ({
          value: t.key,
          label: t.label,
          href: t.href,
        }))}
        value={current}
        className="phone:grid phone:w-full phone:grid-cols-3 phone:[&>a]:h-9 phone:[&>a]:justify-center"
      />
      {action && (
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2.5">
          {action}
        </div>
      )}
    </div>
  )
}
