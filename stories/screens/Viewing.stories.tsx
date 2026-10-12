import type { Meta, StoryObj } from '@storybook/nextjs'
import { useCallback } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import {
  AUTO_OPEN_LABEL,
  LINE_LABEL,
  RECEIVER_ID_LABEL,
  viewingSettingsOf,
} from '@/lib/viewing'
import {
  DATA_BROADCAST_AUTO_OPEN,
  DATA_BROADCAST_LINE,
  DATA_BROADCAST_RECEIVER_ID,
  cookieIn,
  forgettingCookie,
  storingCookie,
} from '@/lib/stored-flag'
import { ViewingView } from '@/components/viewing/viewing-page'
import { inTheSettings } from '@/stories/frames'

const meta = {
  title: 'Screens/設定・視聴',
  component: ViewingView,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/settings/viewing' },
    },
    layout: 'fullscreen',
  },
  decorators: [inTheSettings],
  beforeEach: () => {
    forgetTheSettings()

    return forgetTheSettings
  },
} satisfies Meta<typeof ViewingView>

export default meta
type Story = StoryObj<typeof meta>

const SETTINGS = [
  DATA_BROADCAST_AUTO_OPEN,
  DATA_BROADCAST_LINE,
  DATA_BROADCAST_RECEIVER_ID,
]

function forgetTheSettings() {
  SETTINGS.forEach((key) => {
    document.cookie = forgettingCookie(key)
  })
}

function cookie(key = DATA_BROADCAST_AUTO_OPEN): string | undefined {
  return document.cookie
    .split('; ')
    .find((one) => one.startsWith(`${key}=`))
    ?.split('=')[1]
}

export const 通常: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const autoOpen = canvas.getByRole('switch', { name: AUTO_OPEN_LABEL })

    await expect(autoOpen).not.toBeChecked()

    await userEvent.click(autoOpen)

    await expect(autoOpen).toBeChecked()
    await expect(cookie()).toBe('opens')

    await userEvent.click(autoOpen)

    await expect(autoOpen).not.toBeChecked()
    await expect(cookie()).toBe('waits')
  },
}

export const 自動で開く: Story = {
  args: { autoOpensDataBroadcast: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('switch', { name: AUTO_OPEN_LABEL }),
    ).toBeChecked()
  },
}

export const 通信と識別子: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const line = canvas.getByRole('switch', { name: LINE_LABEL })
    const receiverId = canvas.getByRole('switch', { name: RECEIVER_ID_LABEL })

    await expect(line).not.toBeChecked()
    await expect(receiverId).not.toBeChecked()
    await expect(receiverId).toBeDisabled()

    await userEvent.click(line)

    await expect(line).toBeChecked()
    await expect(cookie(DATA_BROADCAST_LINE)).toBe('allows')
    await expect(receiverId).toBeEnabled()

    await userEvent.click(receiverId)

    await expect(receiverId).toBeChecked()
    await expect(cookie(DATA_BROADCAST_RECEIVER_ID)).toBe('hands')

    await userEvent.click(line)

    await expect(line).not.toBeChecked()
    await expect(cookie(DATA_BROADCAST_LINE)).toBe('refuses')
    await expect(receiverId).not.toBeChecked()
    await expect(receiverId).toBeDisabled()
    await expect(cookie(DATA_BROADCAST_RECEIVER_ID)).toBe('keeps')
  },
}

export const 通信を許可している: Story = {
  args: { allowsTheLine: true, handsTheReceiverId: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole('switch', { name: LINE_LABEL })).toBeChecked()
    await expect(
      canvas.getByRole('switch', { name: RECEIVER_ID_LABEL }),
    ).toBeChecked()
  },
}

/** What hydrating the page's server HTML said was wrong with it, for the play to read. */
const heardWhileHydrating: string[] = []

/** The page as the server draws it from the cookies, then hydrated in the browser that holds the same cookies. */
function FromTheServer() {
  const hydrated = useCallback((node: HTMLDivElement | null) => {
    if (node === null) {
      return
    }

    const settings = viewingSettingsOf((key) => cookieIn(document.cookie, key))
    const page = <ViewingView {...settings} />

    node.innerHTML = renderToString(page)
    const root = hydrateRoot(node, page, {
      onRecoverableError: (error) => {
        heardWhileHydrating.push(String(error))
      },
    })

    return () => {
      setTimeout(() => root.unmount(), 0)
    }
  }, [])

  return <div ref={hydrated} />
}

function storedBeforeTheServerDraws(said: Record<string, string>) {
  return () => {
    forgetTheSettings()
    heardWhileHydrating.length = 0
    Object.entries(said).forEach(([key, value]) => {
      document.cookie = storingCookie(key, value)
    })

    return forgetTheSettings
  }
}

async function hydratedWith(
  canvasElement: HTMLElement,
  line: boolean,
  receiverId: boolean,
) {
  const canvas = within(canvasElement)
  const lineSwitch = await canvas.findByRole('switch', { name: LINE_LABEL })
  const receiverIdSwitch = canvas.getByRole('switch', {
    name: RECEIVER_ID_LABEL,
  })

  await waitFor(() =>
    expect(
      Object.keys(lineSwitch).some((key) => key.startsWith('__reactFiber')),
    ).toBe(true),
  )
  await expect(heardWhileHydrating).toEqual([])
  await expect(lineSwitch).toHaveAttribute('aria-checked', String(line))
  await expect(receiverIdSwitch).toHaveAttribute(
    'aria-checked',
    String(receiverId),
  )

  return { lineSwitch, receiverIdSwitch }
}

export const サーバの絵から組み上がる: Story = {
  args: {},
  render: () => <FromTheServer />,
  beforeEach: storedBeforeTheServerDraws({
    [DATA_BROADCAST_LINE]: 'allows',
    [DATA_BROADCAST_RECEIVER_ID]: 'hands',
  }),
  play: async ({ canvasElement }) => {
    const { receiverIdSwitch } = await hydratedWith(canvasElement, true, true)

    await expect(receiverIdSwitch).toBeEnabled()
  },
}

export const サーバの絵から組み上がる_通信が切: Story = {
  args: {},
  render: () => <FromTheServer />,
  beforeEach: storedBeforeTheServerDraws({
    [DATA_BROADCAST_LINE]: 'refuses',
    [DATA_BROADCAST_RECEIVER_ID]: 'hands',
  }),
  play: async ({ canvasElement }) => {
    const { receiverIdSwitch } = await hydratedWith(canvasElement, false, false)

    await expect(receiverIdSwitch).toBeDisabled()
  },
}
