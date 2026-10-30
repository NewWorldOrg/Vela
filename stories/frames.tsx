import type { Decorator } from '@storybook/nextjs'

import { AppTabBar } from '@/app/(app)/_shell/tab-bar'
import { AppTopBar } from '@/app/(app)/_shell/top-bar'
import { SettingsSideNav } from '@/app/(app)/settings/_shell/side-nav'
import { AdminBody, AdminMain, AppFrame } from '@/components/vela/app-shell'
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

export const inTheSettings: Decorator = (Story) => (
  <AppFrame>
    <AppTopBar />
    <AdminBody className="min-h-0 flex-1">
      <SettingsSideNav hasMigration />
      <AdminMain>
        <Story />
      </AdminMain>
    </AdminBody>
    <AppTabBar />
  </AppFrame>
)
