import { Suspense } from 'react'

import { AppFrame } from '@/components/vela/app-frame'
import { Curtain } from '@/components/vela/curtain'
import { Toasts } from '@/components/vela/toasts'
import { KeptRowsAcrossTurns } from '@/components/vela/kept-rows-across-turns'
import { PushRenewal } from '@/components/notifications/push-renewal'

import { ConflictsBadge } from './_shell/conflicts-badge'
import { ConflictsCount } from './_shell/conflicts-count'
import { AppTabBar } from './_shell/app-tab-bar'
import { AppTopBar } from './_shell/app-top-bar'
import {
  putSubscription,
  readBrowserRows,
  readServerKey,
} from './_shell/actions'

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppFrame>
      <Curtain />
      <KeptRowsAcrossTurns />
      <PushRenewal
        readKey={readServerKey}
        rows={readBrowserRows}
        replace={putSubscription}
      />
      <AppTopBar
        conflicts={
          <Suspense>
            <ConflictsCount />
          </Suspense>
        }
      />
      <Toasts>{children}</Toasts>
      <AppTabBar
        conflicts={
          <Suspense>
            <ConflictsBadge />
          </Suspense>
        }
      />
    </AppFrame>
  )
}
