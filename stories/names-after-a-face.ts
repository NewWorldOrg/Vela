import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

const LONGER_THAN_A_NAME_WAITS = 900

function barOf(canvasElement: HTMLElement): HTMLElement {
  const bar = canvasElement.querySelector('[data-slot="player-chrome"]')

  if (!(bar instanceof HTMLElement)) {
    throw new Error('the bar is not on the screen')
  }

  return bar
}

function named(): HTMLElement | null {
  return document.querySelector('[data-slot="player-tip-name"]')
}

/** Rests on the gear until its name is up, opens its face, closes the face by pressing outside the player, and sees no name left standing over the gear. */
export async function noNameStaysAfterTheFaceCloses(
  canvasElement: HTMLElement,
): Promise<void> {
  const gear = within(barOf(canvasElement)).getByRole('button', {
    name: '設定',
  })

  await userEvent.hover(gear)
  await waitFor(() => expect(named()).toHaveTextContent('設定'), {
    timeout: 3000,
  })
  await userEvent.click(gear)
  await screen.findByRole('dialog', { name: '設定' })
  await userEvent.unhover(gear)
  await userEvent.click(document.body)
  await waitFor(() =>
    expect(screen.queryByRole('dialog', { name: '設定' })).toBeNull(),
  )
  await new Promise((done) => setTimeout(done, LONGER_THAN_A_NAME_WAITS))
  await expect(named()).toBeNull()
}

/** Moves the focus onto the gear with Tab, and sees its name come up as it did. */
export async function tabNamesTheGear(
  canvasElement: HTMLElement,
): Promise<void> {
  const bar = barOf(canvasElement)
  const gear = within(bar).getByRole('button', { name: '設定' })
  const reached = [
    ...bar.querySelectorAll<HTMLElement>('button, input, [tabindex="0"]'),
  ].filter((one) => one.getBoundingClientRect().width > 0)
  const before = reached[reached.indexOf(gear) - 1]

  before.focus()
  await userEvent.tab()
  await expect(document.activeElement).toBe(gear)
  await waitFor(() => expect(named()).toHaveTextContent('設定'), {
    timeout: 3000,
  })
}
