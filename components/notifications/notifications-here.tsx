'use client'

import type { NotificationsScreen } from '@/lib/notifications'
import {
  REASON_OF,
  addThisBrowser,
  readinessOf,
  type PushCarina,
} from '@/lib/web-push'
import { useThisBrowser } from '@/hooks/useThisBrowser'
import {
  NotificationsView,
  type NotificationActions,
} from '@/components/notifications/notifications-view'
import type { BrowserChoice } from '@/components/notifications/add-destination-dialog'
import {
  PUSH_HANDS,
  PUSH_MEMORY,
  forgetThisBrowser,
  readTheFingerprint,
} from '@/components/notifications/this-browser'

/** Settings > notifications with the browser it is open in offered as a destination. */
export function NotificationsHere({
  screen,
  actions,
  push,
}: {
  screen: NotificationsScreen
  actions: NotificationActions
  push: Pick<PushCarina, 'readKey' | 'add'>
}) {
  const here = useThisBrowser()
  const browser: BrowserChoice | undefined = here && {
    here: here.here,
    reason:
      REASON_OF[
        readinessOf({
          ...here.around,
          publicOriginKnown: screen.settings.publicOriginKnown,
        })
      ],
    fingerprint: here.fingerprint,
    onAdd: async ({ name }) => {
      const result = await addThisBrowser(name, PUSH_HANDS, push, PUSH_MEMORY)

      await readTheFingerprint()

      return result
    },
    onForget: forgetThisBrowser,
  }

  return (
    <NotificationsView screen={screen} actions={actions} browser={browser} />
  )
}
