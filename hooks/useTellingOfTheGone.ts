'use client'

import { saidOfTheGone, type NotificationWrite } from '@/lib/notifications'
import { useToast } from '@/components/vela/toasts'

export function useTellingOfTheGone(): (result: NotificationWrite) => void {
  const say = useToast()

  return (result) => {
    const said = saidOfTheGone(result)

    if (said) {
      say({ text: said })
    }
  }
}
