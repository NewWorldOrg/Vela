import { AdminBody, AdminMain } from '@/components/vela/app-shell'
import { getMigration } from '@/repository/migration'

import { SettingsSideNav } from './_shell/side-nav'

export default async function SettingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const migration = await getMigration()

  return (
    <AdminBody className="flex-1">
      <SettingsSideNav hasMigration={migration !== null} />
      <AdminMain>{children}</AdminMain>
    </AdminBody>
  )
}
