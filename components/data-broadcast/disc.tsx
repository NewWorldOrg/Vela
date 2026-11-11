'use client'

import { type ReactNode } from 'react'

import { cn } from '@/lib/utils'
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
} from '@/components/vela/icons'
import { pressable } from '@/components/vela/tactile'
import {
  type Pressing,
  aiming,
} from '@/components/data-broadcast/data-broadcast-palette'

const ENTER_LOOK = cn(
  'absolute top-1/2 left-1/2 z-[1] flex size-(--ok) -translate-1/2 items-center justify-center rounded-full bg-(--pl-accent) text-[length:var(--ok-font)] leading-none font-bold tracking-[-0.02em] text-(--pl-bg) select-none hover:bg-(--pl-accent-ink) focus-visible:shadow-ring focus-visible:outline-none active:translate-[calc(-50%+1px)] active:bg-(--pl-accent)',
  'transition-[translate,background-color] duration-150 ease-toy',
  pressable,
)

const DIAGONALS =
  'before:absolute before:top-1/2 before:left-1/2 before:h-px before:w-[150%] before:-translate-1/2 before:rotate-45 before:bg-white/16 before:content-[""] after:absolute after:top-1/2 after:left-1/2 after:h-px after:w-[150%] after:-translate-1/2 after:-rotate-45 after:bg-white/16 after:content-[""]'

type Way = 'up' | 'down' | 'left' | 'right'

const WEDGES: { way: Way; name: string; shift: string; glyph: ReactNode }[] = [
  {
    way: 'up',
    name: '上',
    shift: '0, calc(var(--reach) * -1)',
    glyph: <ChevronUpIcon className="size-(--arrow)" />,
  },
  {
    way: 'down',
    name: '下',
    shift: '0, var(--reach)',
    glyph: <ChevronDownIcon className="size-(--arrow)" />,
  },
  {
    way: 'left',
    name: '左',
    shift: 'calc(var(--reach) * -1), 0',
    glyph: <ChevronLeftIcon className="size-(--arrow)" />,
  },
  {
    way: 'right',
    name: '右',
    shift: 'var(--reach), 0',
    glyph: <ChevronRightIcon className="size-(--arrow)" />,
  },
]

/** The cross as a remote control has it: one disc with its two diagonals drawn, the four arrows each a wedge of it and Enter at its heart. The wedges reach past the circle and are clipped by it, so a press anywhere in a quarter is that arrow. */
export function Disc({ pressing }: { pressing: Pressing }) {
  return (
    <div
      role="group"
      aria-label="十字"
      data-tap-exempt="a wedge of the disc is the press, as wide as the quarter it fills; the cross through its arrow is narrower than the sector"
      className={cn(
        'relative size-(--disc) shrink-0 overflow-hidden rounded-full bg-white/10',
        DIAGONALS,
      )}
    >
      {WEDGES.map((wedge) => (
        <button
          key={wedge.way}
          type="button"
          aria-label={wedge.name}
          onMouseDown={aiming(pressing)}
          onClick={() => pressing.onKey(wedge.way)}
          style={{
            transform: `translate(-50%, -50%) translate(${wedge.shift}) rotate(45deg)`,
          }}
          className={cn(
            'absolute top-1/2 left-1/2 flex size-(--wedge) items-center justify-center text-(--pl-ink) transition-colors duration-150 ease-out select-none hover:bg-white/8 focus-visible:bg-white/16 focus-visible:outline-none active:bg-white/16 [&_svg]:transition-transform active:[&_svg]:translate-y-px',
            pressable,
          )}
        >
          <span className="block -rotate-45 [&_svg]:stroke-[2]">
            {wedge.glyph}
          </span>
        </button>
      ))}
      <button
        type="button"
        aria-label="決定"
        onMouseDown={aiming(pressing)}
        onClick={() => pressing.onKey('enter')}
        className={ENTER_LOOK}
      >
        決定
      </button>
    </div>
  )
}
