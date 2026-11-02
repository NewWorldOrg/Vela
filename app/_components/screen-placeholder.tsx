import { EmptyState } from '@/components/vela/empty-state'
import type { UsherMood } from '@/components/vela/marks'
import { ScreenMain } from '@/components/vela/app-shell'

export function ScreenPlaceholder({
  usher = 'plain',
  children,
}: {
  usher?: UsherMood
  children: React.ReactNode
}) {
  return (
    <ScreenMain className="flex items-center justify-center p-8">
      <EmptyState usher={usher} className="max-w-[calc(420rem/16)]">
        {children}
      </EmptyState>
    </ScreenMain>
  )
}
