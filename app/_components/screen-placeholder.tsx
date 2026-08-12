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
    <main className="flex flex-1 items-center justify-center p-8">
      <EmptyState spot={spot} className="w-full max-w-[420px]">
        {children}
      </EmptyState>
    </main>
  )
}
