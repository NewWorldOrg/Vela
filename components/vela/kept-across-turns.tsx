'use client'

import { useEffect } from 'react'

import { PHONE_ON_ITS_SIDE, PHONE_UPRIGHT } from '@/lib/phone'

export function KeptAcrossTurns() {
  useEffect(() => {
    const upright = window.matchMedia(PHONE_UPRIGHT)
    const side = window.matchMedia(PHONE_ON_ITS_SIDE)
    let kept = upright.matches ? window.scrollY : 0

    const note = () => {
      if (upright.matches) {
        kept = window.scrollY
      }
    }
    const turned = () => {
      if (!side.matches && upright.matches) {
        const back = kept

        requestAnimationFrame(() => window.scrollTo({ top: back }))
      }
    }

    window.addEventListener('scroll', note, { passive: true })
    side.addEventListener('change', turned)

    return () => {
      window.removeEventListener('scroll', note)
      side.removeEventListener('change', turned)
    }
  }, [])

  return null
}
