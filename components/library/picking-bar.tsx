'use client'

import { useEffect, useRef, useState, type Ref } from 'react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { CloseIcon } from '@/components/vela/icons'
import { iconButtonVariants } from '@/components/vela/icon-button'
import { Spinner } from '@/components/vela/spinner'
import {
  type PickedAction,
  type PickingControls,
  whatItDoes,
} from '@/components/library/picking'
import { PickedCount } from '@/components/library/picked-count'

function enabledOf(actions: readonly PickedAction[]): string {
  return actions.map((one) => (one.enabled ? '1' : '0')).join('')
}

/** The bar floating in the middle of the window's foot while a list is choosing, from the press of `選ぶ` even before one is picked: close, how many, every one, and the one action. It rises in and sinks away, and while it sinks it stays drawn saying what it last said. */
export function PickingBar({
  shown,
  count,
  everyPicked,
  onEvery,
  onClose,
  actions,
  subject,
  closeRef,
  className,
}: PickingControls & {
  shown: boolean
  onClose: () => void
  closeRef?: Ref<HTMLButtonElement>
  className?: string
}) {
  const [drawn, setDrawn] = useState(shown)
  const [said, setSaid] = useState({
    count,
    everyPicked,
    enabled: enabledOf(actions),
  })
  const barRef = useRef<HTMLDivElement>(null)

  if (shown && !drawn) {
    setDrawn(true)
  }

  if (
    shown &&
    (said.count !== count ||
      said.everyPicked !== everyPicked ||
      said.enabled !== enabledOf(actions))
  ) {
    setSaid({ count, everyPicked, enabled: enabledOf(actions) })
  }

  useEffect(() => {
    const bar = barRef.current

    if (!bar || shown) {
      return
    }

    const { animationName, display } = getComputedStyle(bar)

    if (animationName === 'none' || display === 'none') {
      setDrawn(false)
    }
  }, [shown])

  if (!drawn) {
    return null
  }

  return (
    <div
      ref={barRef}
      role={shown ? 'toolbar' : undefined}
      aria-label={shown ? whatItDoes(subject) : undefined}
      aria-hidden={shown ? undefined : true}
      inert={!shown}
      data-slot="picking-bar"
      data-state={shown ? 'open' : 'closed'}
      onAnimationEnd={(event) => {
        if (!shown && event.target === event.currentTarget) {
          setDrawn(false)
        }
      }}
      className={cn(
        'fixed inset-x-0 bottom-[24px] z-50 mx-auto flex w-fit max-w-[calc(100vw-32rem/16)] items-center rounded-full bg-raised py-2 pr-2 pl-2 shadow-[0_0_0_1px_var(--hair),var(--lift)] [--from-y:calc(16rem/16)] data-[state=closed]:disappears data-[state=open]:appears',
        className,
      )}
    >
      <button
        ref={closeRef}
        type="button"
        aria-label="閉じる"
        onClick={onClose}
        className={cn(
          iconButtonVariants({ variant: 'quiet' }),
          'mr-3.5 size-10 bg-surface text-ink not-disabled:hover:bg-surface-2 not-disabled:hover:text-ink dark:bg-surface-3 dark:not-disabled:hover:bg-surface-2 [&_svg]:size-[calc(18rem/16)]',
        )}
      >
        <CloseIcon />
      </button>
      <PickedCount
        count={said.count}
        subject={subject}
        className="min-w-[calc(118rem/16)] text-section font-bold whitespace-nowrap"
      />
      <Button
        variant="tone"
        className="ml-5 dark:bg-surface-3"
        onClick={onEvery}
      >
        {said.everyPicked ? 'すべて外す' : 'すべて選ぶ'}
      </Button>
      {actions.map((action, at) => (
        <Button
          key={action.label}
          variant={action.variant}
          className="ml-3"
          disabled={action.pending || said.enabled[at] !== '1'}
          onClick={action.onPress}
        >
          {action.pending ? <Spinner size="control" /> : action.icon}
          {action.label}
        </Button>
      ))}
    </div>
  )
}
