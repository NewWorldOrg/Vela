import { EmptyState } from '@/components/vela/empty-state'
import type { SpotName } from '@/components/vela/spot-illustration'
import { ScreenMain } from '@/components/vela/app-shell'

export function ScreenPlaceholder({
  spot = 'antenna',
  children,
}: {
  spot?: SpotName
  children: React.ReactNode
}) {
  return (
    <ScreenMain className="flex items-center justify-center p-8">
      <EmptyState spot={spot} className="w-full max-w-[420px]">
        {children}
      </EmptyState>
    </ScreenMain>
  )
}
