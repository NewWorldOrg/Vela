import type { Rect } from '@/lib/caption-placement'
import { APP_SIZE } from '@/lib/hybridcast/messages'
import type { HybridcastReceiver } from '@/lib/hybridcast/receiver'

type PictureWindow = Window & typeof globalThis

const BROADCAST_VIDEOS = new Set(['video/x-iptvf-broadcast', 'video/broadcast'])

export function isBroadcastVideo(type: unknown): boolean {
  return (
    typeof type === 'string' && BROADCAST_VIDEOS.has(type.trim().toLowerCase())
  )
}

export const UNDER_THE_PICTURE = 'data-hybridcast-under'

const UNDER_RULES = `[${UNDER_THE_PICTURE}]{background-color:transparent!important;background-image:none!important}
[${UNDER_THE_PICTURE}]::before{content:"";position:absolute;left:var(--hc-box-x);top:var(--hc-box-y);width:var(--hc-box-w);height:var(--hc-box-h);z-index:-1;pointer-events:none;background-color:var(--hc-bg-color);background-image:var(--hc-bg-image);background-position:var(--hc-bg-position);background-size:var(--hc-bg-size);background-repeat:var(--hc-bg-repeat);-webkit-mask-image:linear-gradient(#000 0 0),linear-gradient(#000 0 0);mask-image:linear-gradient(#000 0 0),linear-gradient(#000 0 0);-webkit-mask-size:100% 100%,var(--hc-hole-w) var(--hc-hole-h);mask-size:100% 100%,var(--hc-hole-w) var(--hc-hole-h);-webkit-mask-position:0 0,var(--hc-hole-x) var(--hc-hole-y);mask-position:0 0,var(--hc-hole-x) var(--hc-hole-y);-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-composite:xor;mask-composite:exclude}`

const ACROSS = [0.02, 0.25, 0.5, 0.75, 0.98]

interface Under {
  background: Record<string, string>
  position: string | null
}

function clipped(box: DOMRect): Rect | null {
  const left = Math.max(0, box.left)
  const top = Math.max(0, box.top)
  const right = Math.min(APP_SIZE.width, box.right)
  const bottom = Math.min(APP_SIZE.height, box.bottom)

  return right > left && bottom > top
    ? { left, top, width: right - left, height: bottom - top }
    : null
}

function shown(object: Element): boolean {
  const checked = (
    object as Element & {
      checkVisibility?: (options: object) => boolean
    }
  ).checkVisibility

  if (checked) {
    return checked.call(object, {
      visibilityProperty: true,
      opacityProperty: true,
    })
  }

  return (
    object.ownerDocument.defaultView?.getComputedStyle(object).visibility ===
    'visible'
  )
}

function drawsABackground(style: CSSStyleDeclaration): boolean {
  return (
    style.backgroundImage !== 'none' ||
    !/^(transparent|rgba\(\d+,\s*\d+,\s*\d+,\s*0\))$/.test(
      style.backgroundColor,
    )
  )
}

function positionable(window: PictureWindow, element: Element): boolean {
  return [...element.querySelectorAll('*')].every((inner) => {
    if (window.getComputedStyle(inner).position !== 'absolute') {
      return true
    }

    for (
      let at = inner.parentElement;
      at && at !== element;
      at = at.parentElement
    ) {
      if (window.getComputedStyle(at).position !== 'static') {
        return true
      }
    }

    return false
  })
}

function underThePicture(
  window: PictureWindow,
  object: Element,
  rect: Rect,
): Element[] {
  const found = new Set<Element>()

  ACROSS.forEach((across) =>
    ACROSS.forEach((down) => {
      const stack = window.document.elementsFromPoint(
        rect.left + rect.width * across,
        rect.top + rect.height * down,
      )
      const at = stack.indexOf(object)

      if (at >= 0) {
        stack.slice(at).forEach((element) => found.add(element))
      }
    }),
  )

  return [...found]
}

function cutAroundThePicture(window: PictureWindow) {
  const marked = new Map<Element, Under>()
  const style = window.document.createElement('style')

  style.textContent = UNDER_RULES
  window.document.head?.append(style)

  const release = (element: Element) => {
    const held = marked.get(element) as Under
    const inline = (element as HTMLElement).style

    element.removeAttribute(UNDER_THE_PICTURE)
    ;[...inline]
      .filter((name) => name.startsWith('--hc-'))
      .forEach((name) => inline.removeProperty(name))

    if (held.position !== null) {
      inline.setProperty('position', held.position)
    }

    marked.delete(element)
  }

  const hold = (element: Element): Under | null => {
    const held = marked.get(element)

    if (held) {
      return held
    }

    const computed = window.getComputedStyle(element)

    if (!drawsABackground(computed)) {
      return null
    }

    const isStatic = computed.position === 'static'

    if (isStatic && !positionable(window, element)) {
      return null
    }

    const under: Under = {
      background: {
        '--hc-bg-color': computed.backgroundColor,
        '--hc-bg-image': computed.backgroundImage,
        '--hc-bg-position': computed.backgroundPosition,
        '--hc-bg-size': computed.backgroundSize,
        '--hc-bg-repeat': computed.backgroundRepeat,
      },
      position: isStatic
        ? (element as HTMLElement).style.getPropertyValue('position')
        : null,
    }

    marked.set(element, under)

    return under
  }

  return (object: Element | null, rect: Rect | null) => {
    const now = object && rect ? underThePicture(window, object, rect) : []

    ;[...marked.keys()]
      .filter((element) => !now.includes(element))
      .forEach(release)

    if (!rect) {
      return
    }

    now.forEach((element) => {
      const under = hold(element)

      if (!under) {
        return
      }

      const inline = (element as HTMLElement).style
      const box = element.getBoundingClientRect()
      const computed = window.getComputedStyle(element)
      const borderLeft = parseFloat(computed.borderLeftWidth) || 0
      const borderTop = parseFloat(computed.borderTopWidth) || 0
      const values: Record<string, string> = {
        ...under.background,
        '--hc-box-x': `${-borderLeft}px`,
        '--hc-box-y': `${-borderTop}px`,
        '--hc-box-w': `${box.width}px`,
        '--hc-box-h': `${box.height}px`,
        '--hc-hole-x': `${rect.left - box.left}px`,
        '--hc-hole-y': `${rect.top - box.top}px`,
        '--hc-hole-w': `${rect.width}px`,
        '--hc-hole-h': `${rect.height}px`,
      }

      Object.entries(values).forEach(([name, value]) => {
        if (inline.getPropertyValue(name) !== value) {
          inline.setProperty(name, value)
        }
      })

      if (under.position !== null && inline.position !== 'relative') {
        inline.setProperty('position', 'relative')
      }

      if (!element.hasAttribute(UNDER_THE_PICTURE)) {
        element.setAttribute(UNDER_THE_PICTURE, '')
      }
    })
  }
}

export function followThePicture(
  window: PictureWindow,
  receiver: HybridcastReceiver,
): void {
  let told: string | null = null
  let asked = false
  const cut = receiver.allows('overTheVideo')
    ? cutAroundThePicture(window)
    : null
  let watching: MutationObserver | null = null

  const measure = () => {
    asked = false

    const object =
      [...window.document.querySelectorAll('object')].find(
        (found) =>
          isBroadcastVideo(found.getAttribute('type')) &&
          shown(found) &&
          clipped(found.getBoundingClientRect()) !== null,
      ) ?? null
    const rect = object ? clipped(object.getBoundingClientRect()) : null
    const said = JSON.stringify(rect)

    if (said !== told) {
      told = said
      receiver.videoAt(rect)
    }

    cut?.(receiver.allows('broadcastVideo') ? object : null, rect)
    watching?.takeRecords()
  }

  const ask = () => {
    if (!asked) {
      asked = true
      window.requestAnimationFrame(measure)
    }
  }

  watching = new window.MutationObserver(ask)
  watching.observe(window.document, {
    subtree: true,
    childList: true,
    attributes: true,
  })
  window.addEventListener('resize', ask)
  window.addEventListener('load', ask)
  window.document.addEventListener('transitionend', ask, true)
  window.document.addEventListener('animationend', ask, true)
  ask()
}
