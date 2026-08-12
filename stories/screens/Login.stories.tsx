import type { Meta, StoryObj } from '@storybook/nextjs'

import { LoginView } from '@/page-component/login/login-view'

const meta = {
  title: 'Screens/ログイン',
  component: LoginView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof LoginView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = {
  args: { failed: false },
}

export const サインイン失敗: Story = {
  args: { failed: true },
}
