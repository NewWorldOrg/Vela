import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, within } from 'storybook/test'

import NotFound from '@/app/not-found'

const meta = {
  title: 'Screens/見つからない画面',
  component: NotFound,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/no-such-page' },
    },
    layout: 'fullscreen',
  },
} satisfies Meta<typeof NotFound>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('ページが見つかりません')).toBeVisible()
    await expect(
      canvas.getByRole('link', { name: 'ライブラリへ' }),
    ).toHaveAttribute('href', '/library')
  },
}
