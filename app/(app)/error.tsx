'use client'

import { startTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'

export default function AppError({ reset }: { reset: () => void }) {
  const router = useRouter()
  const readAgain = (): void => {
    startTransition(() => {
      router.refresh()
      reset()
    })
  }

  return (
    <div
      data-slot="screen-error"
      className="mx-auto flex max-w-[calc(560rem/16)] flex-col items-center gap-7 px-6 pt-[18vh] text-center"
    >
      <h2 className="text-display-s font-bold text-ink phone:text-section">
        画面を表示できませんでした
      </h2>
      <Button variant="tone" onClick={readAgain}>
        再試行
      </Button>
    </div>
  )
}
