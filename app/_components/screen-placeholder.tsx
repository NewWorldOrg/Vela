import type { ReactNode } from 'react'

import { ScreenMain } from '@/components/vela/app-shell'
import { VelaMark } from '@/components/vela/marks'

/** A screen with nothing on it but what happened, in large words under the mark, and the way out. */
export function ScreenPlaceholder({
  title,
  action,
}: {
  title: string
  action: ReactNode
}) {
  return (
    <ScreenMain className="flex flex-col items-center justify-center gap-7 p-8 text-center">
      <VelaMark className="size-10" />
      <h1 className="text-display-s font-bold text-ink phone:text-section">
        {title}
      </h1>
      {action}
    </ScreenMain>
  )
}
