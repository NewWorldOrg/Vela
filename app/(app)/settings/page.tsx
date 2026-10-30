import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { unstable_rethrow } from 'next/navigation'

import { THEME_COOKIE, THEME_LABEL, themeOf } from '@/lib/theme'
import { AUTO_OPEN_LABEL, viewingSettingsOf } from '@/lib/viewing'
import { getSystemStatus } from '@/repository/system'
import { hasMigrationRecord } from '@/repository/migration'
import { SettingsEntranceView } from '@/components/settings-entrance/settings-entrance-page'
import { WideGoesToTheSystem } from '@/components/settings-entrance/wide-goes-to-the-system'

export const metadata: Metadata = { title: '設定' }
export const dynamic = 'force-dynamic'

export default async function Page() {
  const [status, jar, hasMigration] = await Promise.all([
    getSystemStatus(),
    cookies(),
    hasMigrationRecord().catch((error: unknown) => {
      unstable_rethrow(error)

      return false
    }),
  ])
  const said = (key: string) => jar.get(key)?.value
  const viewing = viewingSettingsOf(said)

  return (
    <div className="hidden upright:block">
      <WideGoesToTheSystem />
      <SettingsEntranceView
        status={status}
        hasMigration={hasMigration}
        values={{
          viewing: viewing.autoOpensDataBroadcast ? AUTO_OPEN_LABEL : undefined,
          display: `テーマ ${THEME_LABEL[themeOf(said(THEME_COOKIE))]}`,
        }}
      />
    </div>
  )
}
