'use client'

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'

import { cn } from '@/lib/utils'
import { CloseIcon } from '@/components/vela/icons'
import { PLAYER_GLYPH_BUTTON } from '@/components/recordings/player-palette'

function focused(): HTMLElement | null {
  return typeof document !== 'undefined' &&
    document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null
}

/** One face in the dock: its name and the close at the top, the same for the gear, the caption's face, the data broadcast and a screen's own faces, and Esc closes it as the close does. A screen's face holds what an upright phone shows under the picture in the page's parts; it lays them on the same ink as the others, in the dark theme's colours whatever the theme. It takes the focus to its close when it opens, and gives it back on closing to what opened it (`returnTo`, or whatever had the focus when it opened). */
export function DockFace({
  name,
  onClose,
  returnTo,
  flush = false,
  inPageParts = false,
  children,
}: {
  name: string
  onClose: () => void
  returnTo?: RefObject<HTMLElement | null>
  flush?: boolean
  /** It holds the page's parts rather than the player's, and lays them in the dark theme's colours. */
  inPageParts?: boolean
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
      data-ink-face={inPageParts ? '' : undefined}
      onKeyDown={onKeyDown}
      className={cn(
        inPageParts &&
          'min-h-full text-(--pl-ink) [--bg:var(--pl-bg)] [--surface:var(--pl-bg)]',
      )}
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
