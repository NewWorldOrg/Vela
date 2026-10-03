import { expect, userEvent, waitFor, within } from 'storybook/test'

import { afterTheArrival } from '@/stories/after-the-arrival'

export type ElementFullscreenGone = 'missing' | 'refused'

function onTheScreen(canvasElement: HTMLElement, slot: string): HTMLElement {
  const found = canvasElement.querySelector(`[data-slot="${slot}"]`)

  if (!(found instanceof HTMLElement)) {
    throw new Error(`${slot} is not on the screen`)
  }

  return found
}

async function fillsTheWindow(
  shell: HTMLElement,
  captions: HTMLElement,
): Promise<void> {
  await waitFor(() => expect(shell).toHaveAttribute('data-fill', 'true'))
  await expect(getComputedStyle(shell).position).toBe('fixed')

  const board = shell.getBoundingClientRect()

  await expect(board.left).toBe(0)
  await expect(board.top).toBe(0)
  await expect(board.width).toBe(window.innerWidth)
  await expect(board.height).toBe(window.innerHeight)

  const layer = captions.getBoundingClientRect()

  await expect(captions).toHaveAttribute('data-drawn', 'yes')
  await expect(layer.width).toBe(board.width)
  await expect(layer.bottom).toBeLessThanOrEqual(board.bottom)

  const bar = onTheScreen(shell, 'player-chrome').getBoundingClientRect()

  await expect(bar.bottom).toBeLessThanOrEqual(window.innerHeight)
  await waitFor(() =>
    expect(document.documentElement.style.overflow).toBe('hidden'),
  )
  await expect(document.fullscreenElement).toBeNull()
}

async function givesTheWindowBack(shell: HTMLElement): Promise<void> {
  await waitFor(() => expect(shell).not.toHaveAttribute('data-fill'))
  await expect(getComputedStyle(shell).position).not.toBe('fixed')
  await waitFor(() => expect(document.documentElement.style.overflow).toBe(''))
}

/** Takes element fullscreen away from a player, then sees its fullscreen switch fill the window instead, captions and bar still drawn, and leave it again by the switch and by Escape. */
export async function fillsTheWindowWithoutElementFullscreen(
  canvasElement: HTMLElement,
  shellSlot: string,
  captionsSlot: string,
  gone: ElementFullscreenGone,
): Promise<void> {
  const canvas = within(canvasElement)
  const shell = onTheScreen(canvasElement, shellSlot)
  const captions = onTheScreen(canvasElement, captionsSlot)
  const fullscreen = () => canvas.getByRole('button', { name: '全画面' })

  await afterTheArrival(canvasElement)

  Object.defineProperty(shell, 'requestFullscreen', {
    value:
      gone === 'missing'
        ? undefined
        : () => Promise.reject(new TypeError('not allowed')),
    configurable: true,
  })

  try {
    await userEvent.click(fullscreen())
    await fillsTheWindow(shell, captions)
    await expect(fullscreen()).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(fullscreen())
    await givesTheWindowBack(shell)
    await expect(fullscreen()).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(fullscreen())
    await fillsTheWindow(shell, captions)

    await userEvent.keyboard('{Escape}')
    await givesTheWindowBack(shell)
  } finally {
    Reflect.deleteProperty(shell, 'requestFullscreen')
  }
}
