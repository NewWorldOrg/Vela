'use client'

import { type CSSProperties } from 'react'

import { PlusIcon } from '@/components/vela/icons'
import { useOneTapReserve } from '@/components/guide/reserve-circle'

/** The `+` a pointer finds at the top right of a programme still to come: one click reserves it. A touch screen never shows it, the programme's panel and the phone's row carrying the same press. */
export function ReservePlus({
  style,
  ...reserving
}: Parameters<typeof useOneTapReserve>[0] & { style?: CSSProperties }) {
  const { mark, press } = useOneTapReserve(reserving)

  if (mark !== 'none') {
    return null
  }

  return (
    <button
      type="button"
      data-slot="reserve-plus"
      data-tap-exempt="a pointer's shortcut, the panel the cell opens carrying the same press"
      aria-label={`${reserving.title}を予約`}
      onClick={press}
      style={style}
      className="guide-add"
    >
      <PlusIcon className="size-3.5" strokeWidth={2} />
    </button>
  )
}
