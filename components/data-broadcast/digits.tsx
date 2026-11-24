'use client'

import type { BmlKey } from '@/lib/bml/keys'
import { cn } from '@/lib/utils'
import { type Pressing, aiming, KEY_LOOK } from '@/lib/data-broadcast-palette'

const DIGITS: BmlKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

export function Digits({ pressing }: { pressing: Pressing }) {
  return (
    <div
      role="group"
      aria-label="数字"
      className="flex shrink-0 gap-[calc(var(--key-pitch)-var(--key))]"
    >
      {DIGITS.map((digit) => (
        <button
          key={digit}
          type="button"
          onMouseDown={aiming(pressing)}
          onClick={() => pressing.onKey(digit)}
          className={cn(
            KEY_LOOK,
            'size-(--key) font-code text-[length:var(--key-font)] leading-none after:absolute after:-inset-[2px] after:content-[""]',
          )}
        >
          {digit}
        </button>
      ))}
    </div>
  )
}
