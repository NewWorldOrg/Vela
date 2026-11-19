'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { PHONE_UPRIGHT } from '@/lib/phone'
import { usePhoneUpright } from '@/hooks/usePhone'

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
