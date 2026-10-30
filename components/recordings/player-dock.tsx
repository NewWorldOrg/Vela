'use client'

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react'

import { cn } from '@/lib/utils'
import { CloseIcon } from '@/components/vela/icons'
import {
  PLAYER_COLUMN,
  PLAYER_GLYPH_BUTTON,
} from '@/components/recordings/player-palette'

/** Where the dock opens: under the picture on a phone held upright, beside it on one held on its side. */
export type DockSide = 'under' | 'right'

/** The dock: the one place on a phone where the gear, the caption's face and the data broadcast open, attached to the picture and pushing what follows rather than lying over it. One thing at a time is in it; it is empty and hidden otherwise. */
export function PlayerDock({
  side,
  open,
  ref,
}: {
  side: DockSide
  open: boolean
  ref: Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={ref}
      data-slot="player-dock"
      data-side={side}
      hidden={!open}
      className={cn(
        'overflow-hidden rounded-xl border border-line-strong bg-(--pl-bg) text-(--pl-ink) shadow-pop-xl',
        side === 'under'
          ? cn(PLAYER_COLUMN, 'mt-2')
          : 'ml-3 max-h-[calc(100svh-62rem/16)] w-[calc(320rem/16)] shrink-0 overflow-y-auto overscroll-contain',
      )}
    />
  )
}

function focused(): HTMLElement | null {
  return typeof document !== 'undefined' &&
    document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null
}

/** One face in the dock: its name and the close at the top, the same for the gear, the caption's face and the data broadcast, and Esc closes it as the close does. It takes the focus to its close when it opens, and gives it back on closing to what opened it (`returnTo`, or whatever had the focus when it opened). */
export function DockFace({
  name,
  onClose,
  returnTo,
  flush = false,
  children,
}: {
  name: string
  onClose: () => void
  returnTo?: RefObject<HTMLElement | null>
  flush?: boolean
  children: ReactNode
}) {
  const close = useRef<HTMLButtonElement>(null)
  const [opener] = useState(focused)

  useEffect(() => {
    const back = returnTo?.current ?? opener

    close.current?.focus({ preventScroll: true })

    return () => {
      if (back?.isConnected) {
        back.focus({ preventScroll: true })
      }
    }
  }, [opener, returnTo])

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
    }
  }

  return (
    <section
      role="region"
      aria-label={name}
      data-slot="player-dock-face"
      onKeyDown={onKeyDown}
    >
      <div className="flex items-center gap-2 border-b border-dashed border-white/12 py-1 pr-1.5 pl-4">
        <span className="text-ui font-bold">{name}</span>
        <button
          ref={close}
          type="button"
          aria-label="閉じる"
          onClick={onClose}
          className={cn(PLAYER_GLYPH_BUTTON, 'ml-auto [&_svg]:size-5')}
        >
          <CloseIcon />
        </button>
      </div>
      <div className={flush ? undefined : 'px-4 pb-1'}>{children}</div>
    </section>
  )
}
