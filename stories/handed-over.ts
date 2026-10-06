import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import type { Browsing } from '@/lib/external-player'

interface Leaving extends Event {
  destination: { url: string }
}

interface Navigating {
  addEventListener(type: 'navigate', heard: (leaving: Leaving) => void): void
  removeEventListener(type: 'navigate', heard: (leaving: Leaving) => void): void
}

const OPEN_EXTERNALLY = '外部プレイヤーで再生'

export const AN_IPAD: Browsing = {
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
  maxTouchPoints: 5,
}

export const A_MAC: Browsing = { ...AN_IPAD, maxTouchPoints: 0 }

const THE_RUN_SAYS_SO = /\bStorybookTestRunner\S*/

/** Has the browser name itself as another device for as long as a story is up, and puts back what it said before. A run under test goes on saying so. */
export function browsingAs(device: Browsing): () => () => void {
  return () => {
    const underTest = THE_RUN_SAYS_SO.exec(navigator.userAgent)?.[0]
    const named: Browsing = {
      ...device,
      userAgent: [device.userAgent, underTest].filter(Boolean).join(' '),
    }

    const before = Object.keys(named).map(
      (name) =>
        [name, Object.getOwnPropertyDescriptor(navigator, name)] as const,
    )

    for (const [name, value] of Object.entries(named)) {
      Object.defineProperty(navigator, name, {
        configurable: true,
        get: () => value,
      })
    }

    return () => {
      for (const [name, was] of before) {
        if (was) {
          Object.defineProperty(navigator, name, was)
        } else {
          Reflect.deleteProperty(navigator, name)
        }
      }
    }
  }
}

/** Does what it is given and answers with where the page was sent, without leaving for it. */
export async function whereItLeftFor(
  doing: (left: string[]) => Promise<void>,
): Promise<string[]> {
  const left: string[] = []
  const { navigation } = window as unknown as { navigation: Navigating }
  const held = (leaving: Leaving) => {
    left.push(leaving.destination.url)
    leaving.preventDefault()
  }

  navigation.addEventListener('navigate', held)

  try {
    await doing(left)
  } finally {
    navigation.removeEventListener('navigate', held)
  }

  return left
}

/** Does what it is given and answers with what was put on the clipboard. */
export async function whatWasCopied(
  doing: (copied: string[]) => Promise<void>,
  keeps = true,
): Promise<string[]> {
  const copied: string[] = []

  Object.defineProperty(navigator.clipboard, 'write', {
    configurable: true,
    value: async (items: ClipboardItem[]) => {
      const texts = await Promise.all(
        items.map(async (item) => (await item.getType('text/plain')).text()),
      )

      if (!keeps) {
        throw new DOMException('Write permission denied.', 'NotAllowedError')
      }

      copied.push(...texts)
    },
  })

  try {
    await doing(copied)
  } finally {
    Reflect.deleteProperty(navigator.clipboard, 'write')
  }

  return copied
}

export async function openTheHandoverMenu(
  canvasElement: HTMLElement,
): Promise<HTMLElement> {
  await userEvent.click(
    within(canvasElement).getByRole('button', { name: OPEN_EXTERNALLY }),
  )

  return screen.findByRole('menu')
}

export async function closeTheHandoverMenu() {
  await userEvent.keyboard('{Escape}')
  await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
}

export function whatIsHanded(): string[] {
  return screen
    .queryAllByRole('menuitemradio')
    .map((one) => one.textContent ?? '')
}

export function waysToHandOver(): string[] {
  return screen.getAllByRole('menuitem').map((one) => one.textContent ?? '')
}

export async function pressInTheHandoverMenu(
  canvasElement: HTMLElement,
  item: string,
) {
  if (!screen.queryByRole('menu')) {
    await openTheHandoverMenu(canvasElement)
  }

  await userEvent.click(await screen.findByRole('menuitem', { name: item }))
  await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
}

const MEANS_SOMETHING_IN_A_PATTERN = /[.*+?^${}()|[\]\\]/g

/** The URL a player is handed with the ticket in its path and the name it shows as the title at the end. */
export function namedWithTheTicket(
  path: string,
  ticket: string,
  name: string,
  query = '',
): RegExp {
  const whole = `${path}/with-ticket/${encodeURIComponent(ticket)}/${encodeURIComponent(name)}${query}`

  return new RegExp(
    `^https?://[^/@]+${whole.replace(MEANS_SOMETHING_IN_A_PATTERN, '\\$&')}$`,
  )
}

/** The URL a player app was handed, read back out of where the page was sent. */
export function handedTo(scheme: string, left: string): string | null {
  return left.startsWith(scheme) ? new URL(left).searchParams.get('url') : null
}
