'use client'

import { ruleSetsFull } from '@/lib/notifications'
import { Button } from '@/components/ui/button'
import { PlusIcon } from '@/components/vela/icons'

/** `追加` over the rule sets, which stops at twenty, and before there is anywhere to send to. */
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
