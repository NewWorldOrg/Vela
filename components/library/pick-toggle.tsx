'use client'

import { type Ref } from 'react'

import { cn } from '@/lib/utils'
import { iconButtonVariants } from '@/components/vela/icon-button'

/** The `選ぶ` at the head of a list, drawn pressed while the list is choosing. */
export function PickToggle({
  pressed,
  onPress,
  ref,
  className,
}: {
  pressed: boolean
  onPress: () => void
  ref?: Ref<HTMLButtonElement>
  className?: string
}) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={pressed}
      onClick={onPress}
      className={cn(
        iconButtonVariants(),
        'h-10 w-auto px-4 text-ui font-semibold text-ink',
        pressed &&
          'bg-accent-tint text-acc-text not-disabled:hover:bg-accent-tint not-disabled:hover:text-acc-text',
        className,
      )}
    >
      選ぶ
    </button>
  )
}
