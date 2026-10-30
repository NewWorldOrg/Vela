import { cookies } from 'next/headers'
import { unstable_rethrow } from 'next/navigation'

import { THEME_COOKIE, THEME_LABEL, themeOf } from '@/lib/theme'
import { AUTO_OPEN_LABEL, viewingSettingsOf } from '@/lib/viewing'
import { AdminBody, AdminMain } from '@/components/vela/app-shell'
import { hasMigrationRecord } from '@/repository/migration'
import { getSystemStatus } from '@/repository/system'
import { SettingsBeside } from '@/components/settings-entrance/settings-beside'

import { SettingsSideNav } from './_shell/side-nav'

export default async function SettingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [hasMigration, status, jar] = await Promise.all([
    hasMigrationRecord().catch((error: unknown) => {
      unstable_rethrow(error)

      return false
    }),
    getSystemStatus(),
    cookies(),
  ])
  const said = (key: string) => jar.get(key)?.value
  const viewing = viewingSettingsOf(said)

  return (
    <AdminBody className="min-h-0 flex-1">
      <SettingsSideNav hasMigration={hasMigration} />
      <SettingsBeside
        status={status}
        hasMigration={hasMigration}
        values={{
          viewing: viewing.autoOpensDataBroadcast ? AUTO_OPEN_LABEL : undefined,
          display: `テーマ ${THEME_LABEL[themeOf(said(THEME_COOKIE))]}`,
        }}
      />
      <AdminMain>{children}</AdminMain>
    </AdminBody>
  )
}
