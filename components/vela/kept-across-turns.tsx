'use client'

import { useEffect } from 'react'

import { PHONE_ON_ITS_SIDE, PHONE_UPRIGHT } from '@/lib/phone'

/** Keeps where an upright phone had sent the page while it is turned on its side and back: on its side the watching screens fill the window and the page has nothing to send, so the browser forgets the place; this puts it back when the phone stands up again. Draws nothing. */
export function KeptAcrossTurns() {
  useEffect(() => {
    const upright = window.matchMedia(PHONE_UPRIGHT)
    const side = window.matchMedia(PHONE_ON_ITS_SIDE)
    let kept = upright.matches ? window.scrollY : 0

    const note = () => {
      if (upright.matches) {
        kept = window.scrollY
      }
    }
    const turned = () => {
      if (!side.matches && upright.matches) {
        const back = kept

        requestAnimationFrame(() => window.scrollTo({ top: back }))
      }
    }

    window.addEventListener('scroll', note, { passive: true })
    side.addEventListener('change', turned)

    return () => {
      window.removeEventListener('scroll', note)
      side.removeEventListener('change', turned)
    }
  }, [])

  return null
}

const BAR_BOTTOM_PX = 56

/** The first row marked `data-keep` that shows below the top of what scrolled: the window's, under the bar, or a list's own. */
function topRowIn(scrolled: Document | Element): string | undefined {
  const top =
    scrolled instanceof Element
      ? scrolled.getBoundingClientRect().top
      : BAR_BOTTOM_PX
  const root = scrolled instanceof Element ? scrolled : document

  for (const row of root.querySelectorAll<HTMLElement>('[data-keep]')) {
    const box = row.getBoundingClientRect()

    if (box.height > 0 && box.bottom > top + 1) {
      return row.dataset.keep
    }
  }

  return undefined
}

/** The nearest box around the row that scrolls on its own, or none where the window does. */
function scrollerOf(row: HTMLElement): HTMLElement | undefined {
  for (let up = row.parentElement; up; up = up.parentElement) {
    const { overflowY } = getComputedStyle(up)

    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      up.scrollHeight > up.clientHeight
    ) {
      return up
    }
  }

  return undefined
}

/** Sends the row to the top of what scrolls it: its own list, or the window under the bar. */
function bringToTheTop(row: HTMLElement): void {
  const scroller = scrollerOf(row)
  const at = row.getBoundingClientRect().top

  if (scroller) {
    scroller.scrollTop += at - scroller.getBoundingClientRect().top
  } else {
    window.scrollBy({ top: at - BAR_BOTTOM_PX })
  }
}

/** Keeps the row a list showed first at its top when the phone is turned, either way: the list is laid anew for the other way of holding it, in one column or in two panes, and the row the eye was on is put back at the top. Rows say they can be kept with `data-keep` and their key. Draws nothing. */
export function KeptRowsAcrossTurns() {
  useEffect(() => {
    const side = window.matchMedia(PHONE_ON_ITS_SIDE)
    let kept: string | undefined
    let heldSideways = side.matches
    let turning = false

    const note = (event: Event) => {
      if (turning || side.matches !== heldSideways) {
        return
      }

      const scrolled = event.target instanceof Element ? event.target : document

      kept = topRowIn(scrolled) ?? kept
    }
    const turned = () => {
      const key = kept

      heldSideways = side.matches
      turning = true
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const row = key
            ? [...document.querySelectorAll<HTMLElement>('[data-keep]')].find(
                (one) =>
                  one.dataset.keep === key &&
                  one.getBoundingClientRect().height > 0,
              )
            : undefined

          if (row) {
            bringToTheTop(row)
          }

          turning = false
        }),
      )
    }

    document.addEventListener('scroll', note, { capture: true, passive: true })
    side.addEventListener('change', turned)

    return () => {
      document.removeEventListener('scroll', note, { capture: true })
      side.removeEventListener('change', turned)
    }
  }, [])

  return null
}
