import type { Rect } from '@/lib/caption-placement'

/** How far the skip is raised while the control row is up: the `data-[raised]` translate of `PlayerSkip`. */
export const SKIP_RAISED_REM = 96 / 16

function translateDown(element: Element): number {
  const said = getComputedStyle(element).translate

  if (!said || said === 'none') {
    return 0
  }

  const [, down] = said.split(' ')

  return down ? parseFloat(down) || 0 : 0
}

function rootFontPx(): number {
  return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
}

function contentTop(chrome: HTMLElement): number {
  const tops = Array.from(chrome.children).map((child) => {
    const top = child.getBoundingClientRect().top

    return child instanceof HTMLElement &&
      child.dataset.slot === 'player-controls'
      ? top + (parseFloat(getComputedStyle(child).paddingTop) || 0)
      : top
  })

  return tops.length > 0
    ? Math.min(...tops)
    : chrome.getBoundingClientRect().top
}

/** What lies over the picture's bottom while the control row is up, in the window's coordinates and where each thing's own motion is taking it: the row from the top of what it draws (the seek bar, or the remote's band above it), and the skip button where it is raised to. */
export function clearanceOf(
  chrome: HTMLElement | null,
  shell: HTMLElement | null,
): Rect[] {
  if (!chrome) {
    return []
  }

  const row = chrome.getBoundingClientRect()
  const down = translateDown(chrome)
  const top = contentTop(chrome) - down
  const over: Rect[] = [
    { left: row.left, top, width: row.width, height: row.bottom - down - top },
  ]
  const skip = shell?.querySelector<HTMLElement>('[data-slot="player-skip"]')

  if (skip) {
    const box = skip.getBoundingClientRect()
    const raised = skip.dataset.raised ? SKIP_RAISED_REM * rootFontPx() : 0

    over.push({
      left: box.left,
      top: box.top - translateDown(skip) - raised,
      width: box.width,
      height: box.height,
    })
  }

  return over
}
