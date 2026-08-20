import type { Meta, StoryObj } from '@storybook/nextjs'

import { LoggedOutView } from '@/components/login/logged-out-page'

const meta = {
  title: 'Screens/ログアウト完了',
  component: LoggedOutView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof LoggedOutView>

export default meta
type Story = StoryObj<typeof meta>

export const OIDCのセッションを終えたとき: Story = {
  args: { method: 'oidc' },
}

export const ローカルアカウントのセッションを終えたとき: Story = {
  args: { method: 'local' },
}
