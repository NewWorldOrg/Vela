'use client'

import { ruleSetsFull } from '@/lib/notifications'
import { Button } from '@/components/ui/button'
import { PlusIcon } from '@/components/vela/icons'

export function AddRuleSetButton({
  count,
  destinations,
  onPress,
}: {
  count: number
  destinations: number
  onPress: () => void
}) {
  return (
    <Button
      size="sm"
      disabled={ruleSetsFull(count) || destinations === 0}
      onClick={onPress}
    >
      <PlusIcon />
      追加
    </Button>
  )
}
