import { AdminBody, AdminMain } from '@/components/vela/app-shell'

import { SettingsSideNav } from './_shell/side-nav'

export default function SettingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AdminBody className="flex-1">
      <SettingsSideNav />
      <AdminMain>{children}</AdminMain>
    </AdminBody>
  )
}
