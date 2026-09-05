import { expect, waitFor, within } from 'storybook/test'

/**
 * A list bounded by the window rather than the page by the list: it stops
 * short of the window's height and sends the rest inside, with the header row
 * held at its top while the rows go by under it. Every list whose header row
 * carries the column named is taken, so a screen with two lists of one shape
 * is held to it twice.
 *
 * A screen that is only a list pins the page and gives the list what is left
 * (`pageStays`); a list under something that is read leaves the page free to
 * scroll for that, and is only held to the window itself.
 */
export async function scrollsInsideWithItsHeaderHeld(
  canvasElement: HTMLElement,
  column: string,
  { pageStays = false }: { pageStays?: boolean } = {},
): Promise<void> {
  const headers = within(canvasElement).getAllByRole('columnheader', {
    name: column,
  })

  for (const header of headers) {
    const container = header.closest<HTMLElement>(
      '[data-slot="table-container"]',
    )

    if (!container) {
      throw new Error(`the list headed ${column} has no container to scroll`)
    }

    await expect(container.scrollHeight).toBeGreaterThan(container.clientHeight)
    await expect(container.clientHeight).toBeLessThan(window.innerHeight)

    container.scrollTop = 300

    await waitFor(() => expect(container.scrollTop).toBeGreaterThan(0))

    const headerTop = header.getBoundingClientRect().top
    const containerTop = container.getBoundingClientRect().top

    await expect(Math.abs(headerTop - containerTop)).toBeLessThanOrEqual(1)
  }

  if (pageStays) {
    await expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(
      window.innerHeight,
    )
  }
}
