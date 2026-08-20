'use client'

import { useEffect, useRef, type RefObject } from 'react'

import { escapeDismisses, pressDismisses } from '@/lib/dismiss'

interface Dismissable {
  open: boolean
  onDismiss: () => void
  /**
   * The `data-opens` value carried by the controls that open this surface. A
   * press on one of them is not a press outside.
   */
  opener?: string
}

/**
 * A layer above takes the page's pointer events for as long as it is up, which
 * is how a menu, a select or a modal says that a press belongs to it and not
 * to the surface underneath.
 */
function covered(node: HTMLElement): boolean {
  return node.ownerDocument.body.style.pointerEvents === 'none'
}

/**
 * Gives a floating surface the two ways out every layer is expected to have:
 * a press outside it, and Escape. Focus moves into it when it opens and goes
 * back to whatever opened it when it closes, unless the press that closed it
 * has already put focus somewhere the user chose.
 *
 * The surfaces this serves stay mounted and slide in and out over a live page,
 * with no scrim and nothing trapped behind them. Radix's own layers are modal,
 * unmount when they close and register for the whole life of the component, so
 * wearing one would change how these look and would take Escape while they are
 * shut. The behaviour is theirs; the packaging is not.
 */
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

      // Closing takes the surface out of the tab order, which drops focus on
      // the body. Anywhere else is where the press that closed it left focus,
      // and that is the user's choice to keep.
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
