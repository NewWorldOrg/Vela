'use client'

import { useRef, useState, type ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export const FOLD_MS = 200

export interface Unfolding {
  open?: string
  folding?: string
  toggle: (key: string) => void
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
  const shutting = useRef<number | undefined>(undefined)
  const latest = useRef<{ open?: string; folding?: string }>({})

  const toggle = (key: string): void => {
    const was = latest.current.open
    const next = was === key ? undefined : key
    const folding =
      was !== undefined && was !== next && foldsGradually() ? was : undefined

    latest.current = { open: next, folding }
    window.clearTimeout(shutting.current)
    setUnfolded(latest.current)

    if (folding !== undefined) {
      shutting.current = window.setTimeout(() => {
        latest.current = { open: latest.current.open, folding: undefined }
        setUnfolded(latest.current)
      }, FOLD_MS + 40)
    }
  }

  return { ...unfolded, toggle }
}

export function unfoldShows(held: Unfolding, key: string): boolean {
  return held.open === key || held.folding === key
}

export function Unfold({
  open,
  className,
  bodyClassName,
  children,
  ...props
}: ComponentProps<'div'> & {
  open: boolean
  bodyClassName?: string
}) {
  return (
    <div
      data-slot="unfold"
      data-open={open ? '' : undefined}
      inert={!open}
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
