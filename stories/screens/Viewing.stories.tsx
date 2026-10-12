import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, within } from 'storybook/test'

import { AUTO_OPEN_LABEL } from '@/lib/viewing'
import { DATA_BROADCAST_AUTO_OPEN, forgettingCookie } from '@/lib/stored-flag'
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
    document.cookie = forgettingCookie(DATA_BROADCAST_AUTO_OPEN)

    return () => {
      document.cookie = forgettingCookie(DATA_BROADCAST_AUTO_OPEN)
    }
  },
} satisfies Meta<typeof ViewingView>

export default meta
type Story = StoryObj<typeof meta>

function cookie(): string | undefined {
  return document.cookie
    .split('; ')
    .find((one) => one.startsWith(`${DATA_BROADCAST_AUTO_OPEN}=`))
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
