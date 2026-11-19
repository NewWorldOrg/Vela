'use client'

import { usePathname } from 'next/navigation'

import type { SystemStatus } from '@/repository/system'
import { usePhoneOnItsSide } from '@/hooks/usePhone'
import {
  SettingsEntranceView,
  type SettingsEntranceValues,
} from '@/components/settings-entrance/settings-entrance-view'

export function SettingsBeside({
  status,
  values,
  hasMigration,
}: {
  status: SystemStatus
  values: SettingsEntranceValues
  hasMigration: boolean
}) {
  const sideways = usePhoneOnItsSide()
  const pathname = usePathname()

  if (!sideways) {
    return null
  }

  return (
    <nav
      aria-label="設定"
      data-slot="settings-beside"
      className="sticky top-[calc(52rem/16)] h-[calc(100dvh-52rem/16)] w-[42%] shrink-0 self-start overflow-y-auto overscroll-contain pr-4 pb-[calc(var(--safe-bottom)+16rem/16)] pl-5"
    >
      <SettingsEntranceView
        status={status}
        values={values}
        hasMigration={hasMigration}
        current={pathname}
      />
    </nav>
  )
}
