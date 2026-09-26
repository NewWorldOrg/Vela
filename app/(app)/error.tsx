'use client'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/vela/empty-state'

export default function AppError({ reset }: { reset: () => void }) {
  return (
    <EmptyState
      spot="star"
      titleLevel={2}
      title="画面を表示できませんでした"
      className="mt-16 max-w-[calc(560rem/16)]"
      action={
        <Button variant="change" size="sm" onClick={reset}>
          読み直す
        </Button>
      }
    >
      一時的な不調の可能性があります。読み直しても直らないときは、しばらくおいてから開き直してください。
    </EmptyState>
  )
}
