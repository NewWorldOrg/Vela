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
