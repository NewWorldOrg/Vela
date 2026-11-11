'use client'

import { useContext, type ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { pressable, still } from '@/components/vela/tactile'
import { OpensAFace } from '@/components/recordings/player-dock'

/** A button of the column at the picture's right: its glyph over its word, 52px wide. */
export const STRIP_BUTTON = cn(
  'flex min-h-11 w-[calc(52rem/16)] shrink-0 flex-col items-center justify-center gap-0.5 rounded-md py-1.5 text-[calc(10.5rem/16)] leading-tight font-bold text-(--pl-ink-2) outline-none hover:text-(--pl-ink) focus-visible:shadow-ring [&_svg]:size-[calc(19rem/16)] [&_svg]:text-(--pl-ink)',
  pressable,
  still,
)

/** A button of the column that opens one of the screen's faces in the column's place: its glyph over the face's name. */
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
