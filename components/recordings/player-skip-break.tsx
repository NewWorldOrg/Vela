'use client'

import { cn } from '@/lib/utils'
import { CloseIcon } from '@/components/vela/icons'
import { pressable } from '@/components/vela/tactile'
import { PlayerTip } from '@/components/recordings/player-tip'

export const SKIP_THE_BREAK = 'CM を飛ばす'

const ON_THE_PICTURE =
  'tap-target flex items-center justify-center rounded-full border border-white/25 bg-black/80 text-(--pl-ink) transition-[translate,background-color,color] duration-150 ease-toy hover:-translate-x-px hover:-translate-y-px hover:bg-black/90 hover:text-white active:translate-x-px active:translate-y-px focus-visible:shadow-ring focus-visible:outline-none still:transition-none'

export function PlayerSkipBreak({
  to,
  raised,
  onSkip,
  onDismiss,
  container,
}: {
  to: number
  raised: boolean
  onSkip: (to: number) => void
  onDismiss: (to: number) => void
  container: HTMLElement | null
}) {
  return (
    <div
      data-slot="player-skip-break"
      data-raised={raised ? 'true' : undefined}
      className={cn(
        'absolute right-4 bottom-5 z-20 flex items-center gap-2 appears [--from-y:8px] max-[700px]:right-3',
        'transition-[translate] duration-100 ease-[cubic-bezier(.4,0,1,1)] data-[raised]:-translate-y-[calc(96rem/16)] data-[raised]:duration-[250ms] data-[raised]:ease-[cubic-bezier(0,0,.2,1)] still:transition-none',
      )}
    >
      <button
        type="button"
        onClick={() => onSkip(to)}
        className={cn(
          ON_THE_PICTURE,
          'px-[calc(18rem/16)] py-2 text-ui font-bold whitespace-nowrap',
          pressable,
        )}
      >
        {SKIP_THE_BREAK}
      </button>
      <PlayerTip name="閉じる" container={container}>
        <button
          type="button"
          aria-label="閉じる"
          onClick={() => onDismiss(to)}
          className={cn(ON_THE_PICTURE, 'size-9 [&_svg]:size-4', pressable)}
        >
          <CloseIcon />
        </button>
      </PlayerTip>
    </div>
  )
}
