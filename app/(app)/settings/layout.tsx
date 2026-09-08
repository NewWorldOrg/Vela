import { AdminBody, AdminMain } from '@/components/vela/app-shell'
import { hasMigrationRecord } from '@/repository/migration'

import { SettingsSideNav } from './_shell/side-nav'

export default async function SettingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const hasMigration = await hasMigrationRecord()

  return (
    <AdminBody className="min-h-0 flex-1">
      <SettingsSideNav hasMigration={hasMigration} />
      <AdminMain>{children}</AdminMain>
    </AdminBody>
  )
}
