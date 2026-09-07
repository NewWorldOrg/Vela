'use client'

import { useEffect, useRef, type RefObject } from 'react'

import { escapeDismisses, pressDismisses } from '@/lib/dismiss'

interface Dismissable {
  open: boolean
  onDismiss: () => void
  opener?: string
}

function covered(node: HTMLElement): boolean {
  return node.ownerDocument.body.style.pointerEvents === 'none'
}

export function useDismissable<T extends HTMLElement>({
  open,
  onDismiss,
  opener,
}: Dismissable): RefObject<T | null> {
  const surface = useRef<T>(null)

  useEffect(() => {
    const node = surface.current

    if (!open || node === null) {
      return
    }

    const onPointerDown = (event: PointerEvent) => {
      const pressed = event.target

      if (
        pressed instanceof Element &&
        pressDismisses({
          pressed,
          inside: node.contains(pressed),
          opener,
          covered: covered(node),
        })
      ) {
        onDismiss()
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        escapeDismisses({ covered: covered(node) })
      ) {
        onDismiss()
      }
    }

    const owner = node.ownerDocument

    owner.addEventListener('pointerdown', onPointerDown)
    owner.addEventListener('keydown', onKeyDown)

    return () => {
      owner.removeEventListener('pointerdown', onPointerDown)
      owner.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onDismiss, opener])

  useEffect(() => {
    const node = surface.current

    if (!open || node === null) {
      return
    }

    const owner = node.ownerDocument
    const opened = owner.activeElement

    node.focus({ preventScroll: true })

    return () => {
      const active = owner.activeElement

      if (active !== null && active !== owner.body && !node.contains(active)) {
        return
      }

      if (opened instanceof HTMLElement) {
        opened.focus({ preventScroll: true })
      }
    }
  }, [open])

  return surface
}
