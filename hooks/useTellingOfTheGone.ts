'use client'

import { saidOfTheGone, type NotificationWrite } from '@/lib/notifications'
import { useToast } from '@/components/vela/toasts'

/** Says the refusal of a write to what is no longer there as a toast, which stays when the row and the dialog that asked leave the page. */
export function useTellingOfTheGone(): (result: NotificationWrite) => void {
  const say = useToast()

  return (result) => {
    const said = saidOfTheGone(result)

    if (said) {
      say({ text: said })
    }
  }
}
