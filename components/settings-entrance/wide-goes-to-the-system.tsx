'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { PHONE_UPRIGHT } from '@/lib/phone'
import { usePhoneUpright } from '@/hooks/usePhone'

/** The entrance is a phone's: a window that is not a phone held upright goes on to the first setting, as the side nav would. Asked of the window itself, because the hook says no on the first render after the server's. */
export function WideGoesToTheSystem() {
  const router = useRouter()
  const upright = usePhoneUpright()

  useEffect(() => {
    if (!window.matchMedia(PHONE_UPRIGHT).matches) {
      router.replace('/settings/system')
    }
  }, [router, upright])

  return null
}
