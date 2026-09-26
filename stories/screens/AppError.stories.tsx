import type { Meta, StoryObj } from '@storybook/nextjs'
import { getRouter } from '@storybook/nextjs/navigation.mock'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import AppError from '@/app/(app)/error'
import { inTheApp } from '@/stories/frames'

const meta = {
  title: 'Screens/表示できなかった画面',
  component: AppError,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/guide' },
    },
    layout: 'fullscreen',
  },
  args: { reset: fn() },
  decorators: [inTheApp],
} satisfies Meta<typeof AppError>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('heading', {
        level: 2,
        name: '画面を表示できませんでした',
      }),
    ).toBeVisible()
    await expect(canvas.getByRole('button', { name: '読み直す' })).toBeVisible()
  },
}

export const 読み直すと画面を取り直す: Story = {
  play: async ({ args, canvasElement }) => {
    getRouter().refresh.mockClear()

    await userEvent.click(
      within(canvasElement).getByRole('button', { name: '読み直す' }),
    )

    await waitFor(() => expect(args.reset).toHaveBeenCalledTimes(1))
    await expect(getRouter().refresh).toHaveBeenCalledTimes(1)
  },
}
