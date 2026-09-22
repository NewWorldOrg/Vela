'use client'

import { useEffect, useRef, useState, type ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export interface Unfolding {
  open?: string
  folding?: string
  toggle: (key: string) => void
  settle: (key: string) => void
}

function foldsGradually(): boolean {
  return (
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    document.documentElement.dataset.motion !== 'still'
  )
}

/*
 * One thing open at a time, and one thing on its way shut: a row that is
 * shutting still has to draw what is inside it until the movement ends, and
 * nothing else in the page should have to know that.
 */
export function useUnfolding(): Unfolding {
  const [unfolded, setUnfolded] = useState<{
    open?: string
    folding?: string
  }>({})

  return {
    ...unfolded,
    toggle: (key) =>
      setUnfolded(({ open }) => {
        const next = open === key ? undefined : key

        return {
          open: next,
          folding:
            open !== undefined && open !== next && foldsGradually()
              ? open
              : undefined,
        }
      }),
    settle: (key) =>
      setUnfolded((held) =>
        held.folding === key ? { open: held.open, folding: undefined } : held,
      ),
  }
}

export function unfoldShows(held: Unfolding, key: string): boolean {
  return held.open === key || held.folding === key
}

/*
 * The one way a thing opens and shuts in place: the row it sits in grows from
 * no height to its own height, and what is inside arrives with it. There were
 * three copies of this and two of them did not move at all.
 *
 * What is inside stays in the page at no height, so the fold has something to
 * show while it shuts. A caller with a long list to draw can mount it late
 * instead and let `onSettle` say when the shutting is over.
 */
export function Unfold({
  open,
  onSettle,
  className,
  bodyClassName,
  children,
  ...props
}: ComponentProps<'div'> & {
  open: boolean
  onSettle?: () => void
  bodyClassName?: string
}) {
  const fold = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = fold.current

    if (open || element === null || onSettle === undefined) {
      return
    }

    /*
     * When there is no movement to wait for (a reader who asked for less of
     * it, or a fold that was already shut), the end never arrives on its own.
     */
    const shut = getComputedStyle(element).gridTemplateRows === '0px'

    if (shut || element.getAnimations().length === 0) {
      onSettle()
    }
  }, [open, onSettle])

  return (
    <div
      ref={fold}
      data-slot="unfold"
      data-open={open ? '' : undefined}
      inert={!open}
      onTransitionEnd={(event) => {
        if (
          event.target === event.currentTarget &&
          event.propertyName === 'grid-template-rows'
        ) {
          onSettle?.()
        }
      }}
      className={cn(
        'unfolds grid',
        open ? 'grid-rows-[1fr] starting:grid-rows-[0fr]' : 'grid-rows-[0fr]',
        className,
      )}
      {...props}
    >
      <div
        data-slot="unfold-body"
        className={cn('overflow-hidden', open && 'arrives', bodyClassName)}
      >
        {children}
      </div>
    </div>
  )
}
