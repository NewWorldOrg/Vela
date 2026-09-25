import type { Decorator } from '@storybook/nextjs'

import { AppTopBar } from '@/app/(app)/_shell/top-bar'
import { SettingsSideNav } from '@/app/(app)/settings/_shell/side-nav'
import { AdminBody, AdminMain, AppFrame } from '@/components/vela/app-shell'

export const inTheApp: Decorator = (Story) => (
  <AppFrame>
    <AppTopBar />
    <Story />
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
  </AppFrame>
)
