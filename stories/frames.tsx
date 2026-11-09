import type { Decorator } from '@storybook/nextjs'

import { AppTabBar } from '@/app/(app)/_shell/tab-bar'
import { AppTopBar } from '@/app/(app)/_shell/top-bar'
import { AppFrame } from '@/components/vela/app-shell'
import { SettingsFrame } from '@/components/settings-entrance/settings-frame'
import { SYSTEM_STATUS } from '@/repository/system.fixtures'
import { Toasts } from '@/components/vela/toast'

export const inTheApp: Decorator = (Story) => (
  <AppFrame>
    <AppTopBar />
    <Toasts>
      <Story />
    </Toasts>
    <AppTabBar />
  </AppFrame>
)

/** The settings frame with notifications in its list, for their stories until their screen is in the app. */
export const inTheSettingsWithNotifications: Decorator = (Story) => (
  <AppFrame>
    <AppTopBar />
    <Toasts>
      <SettingsFrame
        status={SYSTEM_STATUS}
        values={{ display: 'テーマ システム' }}
        hasMigration
        hasNotifications
      >
        <Story />
      </SettingsFrame>
    </Toasts>
    <AppTabBar />
  </AppFrame>
)

export const inTheSettings: Decorator = (Story) => (
  <AppFrame>
    <AppTopBar />
    <Toasts>
      <SettingsFrame
        status={SYSTEM_STATUS}
        values={{ display: 'テーマ システム' }}
        hasMigration
      >
        <Story />
      </SettingsFrame>
    </Toasts>
    <AppTabBar />
  </AppFrame>
)
