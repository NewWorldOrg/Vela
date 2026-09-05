'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const EVERY_MS = 5000

export function EncodeTicker({ active }: { active: boolean }) {
  const router = useRouter()

  useEffect(() => {
    if (!active) {
      return
    }

    const timer = setInterval(() => router.refresh(), EVERY_MS)

    return () => clearInterval(timer)
  }, [active, router])

  return null
}
