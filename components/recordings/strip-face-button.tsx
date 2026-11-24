'use client'

import { useContext, type ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { pressable, still } from '@/lib/tactile'
import { OpensAFace } from '@/components/recordings/player-dock'

export const STRIP_BUTTON = cn(
  'flex min-h-11 w-[calc(52rem/16)] shrink-0 flex-col items-center justify-center gap-0.5 rounded-md py-1.5 text-[calc(10.5rem/16)] leading-tight font-bold text-(--pl-ink-2) outline-none hover:text-(--pl-ink) focus-visible:shadow-ring [&_svg]:size-[calc(19rem/16)] [&_svg]:text-(--pl-ink)',
  pressable,
  still,
)

export function StripFaceButton({
  face,
  glyph,
}: {
  face: string
  glyph: ReactNode
}) {
  const open = useContext(OpensAFace)

  return (
    <button type="button" onClick={() => open(face)} className={STRIP_BUTTON}>
      {glyph}
      {face}
    </button>
  )
}
