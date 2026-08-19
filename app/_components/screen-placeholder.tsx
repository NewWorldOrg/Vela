import { EmptyState } from '@/components/vela/empty-state'
import type { SpotName } from '@/components/vela/spot-illustration'

export function ScreenPlaceholder({
  spot = 'antenna',
  children,
}: {
  spot?: SpotName
  children: React.ReactNode
}) {
  return (
    <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-8">
      <EmptyState spot={spot} className="w-full max-w-[420px]">
        {children}
      </EmptyState>
    </main>
  )
}
