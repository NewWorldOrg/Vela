import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, within } from 'storybook/test'

import { MOTION_LABEL } from '@/lib/motion'
import { DisplayView } from '@/components/display/display-page'
import { inTheSettings } from '@/stories/frames'

const meta = {
  title: 'Screens/設定・表示',
  component: DisplayView,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/settings/display' },
    },
    layout: 'fullscreen',
  },
  decorators: [inTheSettings],
} satisfies Meta<typeof DisplayView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const motion = canvas.getByRole('switch', { name: MOTION_LABEL })

    await expect(motion).toBeChecked()
  },
}

export const 動きを切っている: Story = {
  args: { motion: 'still' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const motion = canvas.getByRole('switch', { name: MOTION_LABEL })

    await expect(motion).not.toBeChecked()

    await userEvent.click(motion)

    await expect(motion).toBeChecked()
    await expect(document.documentElement.dataset.motion).toBe('moves')
  },
}
