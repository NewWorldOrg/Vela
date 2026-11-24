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
import { PLAYER_GLYPH_BUTTON } from '@/lib/player-palette'

function focused(): HTMLElement | null {
  return typeof document !== 'undefined' &&
    document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null
}

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
