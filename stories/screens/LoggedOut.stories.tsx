import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, within } from 'storybook/test'

import { LoggedOutView } from '@/components/login/logged-out-page'

const meta = {
  title: 'Screens/サインアウト完了',
  component: LoggedOutView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof LoggedOutView>

export default meta
type Story = StoryObj<typeof meta>

const STILL_SIGNED_IN_THERE =
  '組織の ID プロバイダーからはサインアウトしていません'

async function signedOut(canvasElement: HTMLElement): Promise<void> {
  const canvas = within(canvasElement)

  await expect(
    canvas.getByRole('heading', { level: 1, name: 'サインアウトしました' }),
  ).toBeVisible()
  await expect(
    canvas.getByRole('link', { name: 'サインインへ' }),
  ).toHaveAttribute('href', '/login')
}

export const OIDCのセッションを終えたとき: Story = {
  args: { method: 'oidc' },
  play: async ({ canvasElement }) => {
    await signedOut(canvasElement)
    await expect(
      within(canvasElement).getByText(STILL_SIGNED_IN_THERE),
    ).toBeVisible()
  },
}

export const ローカルアカウントのセッションを終えたとき: Story = {
  args: { method: 'local' },
  play: async ({ canvasElement }) => {
    await signedOut(canvasElement)
    await expect(
      within(canvasElement).queryByText(STILL_SIGNED_IN_THERE),
    ).toBeNull()
  },
}
