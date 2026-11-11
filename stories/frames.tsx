import type { Decorator } from '@storybook/nextjs'

import { AppTabBar } from '@/app/(app)/_shell/app-tab-bar'
import { AppTopBar } from '@/app/(app)/_shell/app-top-bar'
import { AppFrame } from '@/components/vela/app-frame'
import { SettingsFrame } from '@/components/settings-entrance/settings-frame'
import { SYSTEM_STATUS } from '@/repository/system.fixtures'
import { Toasts } from '@/components/vela/toasts'

export const inTheApp: Decorator = (Story) => (
  <AppFrame>
    <AppTopBar />
    <Toasts>
      <Story />
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
