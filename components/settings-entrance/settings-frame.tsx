'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

import type { SystemStatus } from '@/repository/system'
import { AdminMain } from '@/components/vela/admin-main'
import {
  SettingsEntranceView,
  type SettingsEntranceValues,
} from '@/components/settings-entrance/settings-entrance-page'
import { SettingsBeside } from '@/components/settings-entrance/settings-beside'

/** The page heading of a setting, at the size of the frame's second level, under the frame's own `設定`. */
const A_SETTINGS_HEADING =
  '[&_[data-slot=page-heading]_h1]:text-[calc(28rem/16)] [&_[data-slot=page-heading]_h1]:leading-[calc(34rem/16)] [&_[data-slot=page-heading]_h1]:font-bold [&_[data-slot=page-heading]_h1]:tracking-[-0.025em]'

/** Every setting's frame: `設定` over the entrance at the left, which marks the setting open, and the setting at the right, the three held together in a column of at most 1280px in the middle of a wide window. A phone held upright opens the entrance as a screen of its own and the setting full width; on its side the entrance stays beside the setting. */
export function SettingsFrame({
  status,
  values,
  hasMigration,
  children,
}: {
  status: SystemStatus
  values: SettingsEntranceValues
  hasMigration: boolean
  children: ReactNode
}) {
  const pathname = usePathname()

  return (
    <div
      data-slot="settings-frame"
      className="flex min-h-0 flex-1 flex-col px-6 pt-3.5 min-[1366px]:px-10 phone:p-0"
    >
      <div
        data-slot="settings-composition"
        className="mx-auto flex min-h-0 w-full max-w-[calc(1280rem/16)] flex-1 flex-col"
      >
        <p
          aria-hidden="true"
          className="text-display font-bold tracking-[-0.03em] text-ink phone:hidden"
        >
          設定
        </p>
        <div className="flex min-h-0 flex-1 gap-6 min-[1366px]:gap-10 max-[900px]:gap-5 phone:gap-0">
          <nav
            aria-label="設定"
            data-slot="settings-side"
            className="sticky top-(--top-bar) max-h-[calc(100dvh-var(--top-bar))] w-[calc(260rem/16)] shrink-0 self-start overflow-y-auto overscroll-contain [scrollbar-width:none] min-[1366px]:w-[calc(340rem/16)] max-[900px]:w-[calc(240rem/16)] phone:hidden"
          >
            <SettingsEntranceView
              status={status}
              values={values}
              hasMigration={hasMigration}
              current={pathname}
              withValues={false}
            />
          </nav>
          <SettingsBeside
            status={status}
            values={values}
            hasMigration={hasMigration}
          />
          <AdminMain
            className={`px-0 pt-3.5 pb-10 [&_[data-slot=crumb]]:hidden ${A_SETTINGS_HEADING}`}
          >
            {children}
          </AdminMain>
        </div>
      </div>
    </div>
  )
}
