import { expect } from 'storybook/test'

function clipOf(band: Element): Element | null {
  for (
    let above = band.parentElement;
    above !== null;
    above = above.parentElement
  ) {
    if (getComputedStyle(above).overflowX !== 'visible') {
      return above
    }
  }

  return null
}

/** Where a clip stops drawing on its right: its box, and for `overflow: clip` the margin it keeps for rings and shadows. */
function rightEdgeOf(clip: Element): number {
  const style = getComputedStyle(clip)
  const margin = /([\d.]+)px/.exec(style.overflowClipMargin)
  const kept = style.overflowX === 'clip' ? Number(margin?.[1] ?? 0) : 0

  return clip.getBoundingClientRect().right + kept
}

/** Runs every band's slide in the column to its end while the column has yet to narrow, finds no edge of a band left inside its clip, then lets the fold settle. */
export async function slidOutWhole(column: HTMLElement): Promise<void> {
  const running = column.getAnimations({ subtree: true })
  const slides = running.filter(
    (one) =>
      one instanceof CSSTransition && one.transitionProperty === 'translate',
  )

  await expect(slides.length).toBeGreaterThan(0)
  for (const one of running) {
    one.pause()
  }
  for (const one of slides) {
    one.currentTime = one.effect?.getComputedTiming().endTime ?? 0
  }

  for (const one of slides) {
    const band = (one.effect as KeyframeEffect).target!
    const clip = clipOf(band)

    await expect(clip).not.toBeNull()
    await expect(band.getBoundingClientRect().left).toBeGreaterThanOrEqual(
      rightEdgeOf(clip!) - 0.5,
    )
  }

  for (const one of running) {
    one.finish()
  }
}
