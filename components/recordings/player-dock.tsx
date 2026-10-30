'use client'

import {
  createContext,
  useContext,
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
import { pressable, still } from '@/components/vela/tactile'
import {
  PLAYER_COLUMN,
  PLAYER_GLYPH_BUTTON,
} from '@/components/recordings/player-palette'

/** Where the dock opens: under the picture on a phone held upright, beside it on one held on its side. */
export type DockSide = 'under' | 'right'

/** What a screen keeps at the picture's right on a phone held on its side: the column of its buttons, and the faces those buttons open in the dock in the column's place. */
export interface SideColumn {
  /** The column's buttons; a `StripFaceButton` among them opens one of the faces. */
  strip: ReactNode
  /** What each of the screen's faces holds, by the name its head says. */
  faces: Readonly<Record<string, ReactNode>>
}

const OpensAFace = createContext<(name: string) => void>(() => {})

/** The column at the picture's right on a phone held on its side: the screen's buttons, as high as the window, on the player's ground. Kept while a face stands in its place, only hidden, so what it had scrolled to is still there when the face closes. */
export function PlayerStrip({
  hidden,
  onOpen,
  children,
}: {
  hidden: boolean
  onOpen: (name: string) => void
  children: ReactNode
}) {
  return (
    <div
      data-slot="player-strip"
      hidden={hidden}
      className="flex w-[calc(57rem/16+env(safe-area-inset-right))] shrink-0 flex-col items-center gap-1.5 self-stretch border-l border-white/6 bg-(--pl-bg) pt-2 pr-[env(safe-area-inset-right)] pb-[calc(var(--safe-bottom)+8rem/16)] text-(--pl-ink) [&[hidden]]:hidden"
    >
      <OpensAFace value={onOpen}>{children}</OpensAFace>
    </div>
  )
}

/** A button of the column at the picture's right: its glyph over its word, 52px wide. */
export const STRIP_BUTTON = cn(
  'flex min-h-11 w-[calc(52rem/16)] shrink-0 flex-col items-center justify-center gap-0.5 rounded-[calc(12rem/16)] py-1.5 text-[calc(10.5rem/16)] leading-tight font-bold text-(--pl-ink-2) outline-none hover:text-(--pl-ink) focus-visible:shadow-ring [&_svg]:size-[calc(19rem/16)] [&_svg]:text-(--pl-ink)',
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
          : 'ml-3 w-[calc(300rem/16+env(safe-area-inset-right))] shrink-0 self-stretch overflow-y-auto overscroll-contain rounded-none border-0 border-l border-white/8 pr-[env(safe-area-inset-right)] pb-(--safe-bottom) shadow-none has-[[data-tone=page]]:border-line has-[[data-tone=page]]:bg-surface',
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

/** One face in the dock: its name and the close at the top, the same for the gear, the caption's face, the data broadcast and a screen's own faces, and Esc closes it as the close does. A screen's face is in the page's colours, as the same things are under the picture on a phone held upright. It takes the focus to its close when it opens, and gives it back on closing to what opened it (`returnTo`, or whatever had the focus when it opened). */
export function DockFace({
  name,
  onClose,
  returnTo,
  flush = false,
  tone = 'player',
  children,
}: {
  name: string
  onClose: () => void
  returnTo?: RefObject<HTMLElement | null>
  flush?: boolean
  tone?: 'player' | 'page'
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
      data-tone={tone}
      onKeyDown={onKeyDown}
      className={cn(tone === 'page' && 'min-h-full bg-surface text-ink')}
    >
      <div
        className={cn(
          'flex items-center gap-2 border-b border-dashed py-1 pr-1.5 pl-4',
          tone === 'page' ? 'border-line' : 'border-white/12',
        )}
      >
        <span className="text-ui font-bold">{name}</span>
        <button
          ref={close}
          type="button"
          aria-label="閉じる"
          onClick={onClose}
          className={cn(
            PLAYER_GLYPH_BUTTON,
            'ml-auto [&_svg]:size-5',
            tone === 'page' && 'text-ink-2 hover:text-ink',
          )}
        >
          <CloseIcon />
        </button>
      </div>
      <div className={flush ? undefined : 'px-4 pb-1'}>{children}</div>
    </section>
  )
}
