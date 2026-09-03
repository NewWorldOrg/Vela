'use client'

import { useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { ChevronDownIcon, ChevronRightIcon } from '@/components/vela/icons'
import { Surface } from '@/components/vela/surface'
import { pressable } from '@/components/vela/tactile'

/**
 * The raw readings, folded away until asked for. What the panels above carry
 * is what a reading is for — whether each part answers, and whether anything
 * the app needs is absent. The identifiers behind this are what an operator
 * reaches for afterwards, and left in the open they are the whole page.
 *
 * Which way it is folded is not state a second person opening the link would
 * need, so it stays here rather than on the URL.
 */
export function SystemDetails({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(
          'tap-target -my-2 inline-flex items-center gap-1.5 rounded-full py-2 text-note font-bold text-ink-2',
          'transition-colors duration-150 ease-out hover:text-ink',
          pressable,
        )}
      >
        {open ? (
          <ChevronDownIcon className="size-3.5" />
        ) : (
          <ChevronRightIcon className="size-3.5" />
        )}
        詳細
      </button>
      {open && <Surface className="mt-2.5 basis-full">{children}</Surface>}
    </>
  )
}
