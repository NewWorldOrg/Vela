import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, within } from 'storybook/test'

import { MOTION_LABEL } from '@/lib/motion'
import { DisplayView } from '@/components/display/display-page'
import { askedForLessMotion } from '@/stories/asked-for-less-motion'
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

export const 端末が動きを減らしている: Story = {
  args: {},
  beforeEach: () => askedForLessMotion(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const motion = canvas.getByRole('switch', { name: MOTION_LABEL })

    await expect(motion).not.toBeChecked()

    await userEvent.click(motion)

    await expect(motion).toBeChecked()
    await expect(document.documentElement.dataset.motion).toBe('moves')
  },
}

export const 端末が動きを減らしていても入を選んでいる: Story = {
  args: { motion: 'moves' },
  beforeEach: () => askedForLessMotion(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('switch', { name: MOTION_LABEL }),
    ).toBeChecked()
  },
}

function themeCookie(): string | undefined {
  return document.cookie
    .split('; ')
    .find((one) => one.startsWith('vela-theme-mode='))
    ?.split('=')[1]
}

export const テーマを切り替える: Story = {
  args: {},
  beforeEach: () => {
    const held = document.documentElement.className

    return () => {
      document.documentElement.className = held
      document.cookie = 'vela-theme-mode=;path=/;max-age=0'
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const theme = canvas.getByRole('group', { name: 'テーマ' })
    const html = document.documentElement

    await userEvent.click(within(theme).getByRole('button', { name: 'ダーク' }))

    await expect(
      within(theme).getByRole('button', { name: 'ダーク' }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(html).toHaveClass('dark')
    await expect(html).not.toHaveClass('system')
    await expect(themeCookie()).toBe('dark')

    await userEvent.click(
      within(theme).getByRole('button', { name: 'システム' }),
    )

    await expect(html).toHaveClass('system')
    await expect(html).not.toHaveClass('dark')
    await expect(themeCookie()).toBe('system')

    await userEvent.click(within(theme).getByRole('button', { name: 'ライト' }))

    await expect(
      within(theme).getByRole('button', { name: 'ライト' }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(html).not.toHaveClass('system')
    await expect(html).not.toHaveClass('dark')
    await expect(themeCookie()).toBe('light')
  },
}
