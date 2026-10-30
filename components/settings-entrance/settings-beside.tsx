'use client'

import { usePathname } from 'next/navigation'

import type { SystemStatus } from '@/repository/system'
import { usePhoneOnItsSide } from '@/hooks/usePhone'
import {
  SettingsEntranceView,
  type SettingsEntranceValues,
} from '@/components/settings-entrance/settings-entrance-page'

/** The settings' entrance at the left of the setting open, on a phone held on its side: the same list an upright phone opens first, the open setting marked in it. Drawn nowhere else. */
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
      data-sideways-panes=""
      className="min-h-0 w-[42%] shrink-0 overflow-y-auto overscroll-contain border-r border-line pr-4 pb-[calc(var(--safe-bottom)+16rem/16)] pl-5"
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
