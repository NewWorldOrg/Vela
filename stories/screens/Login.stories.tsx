import type { Meta, StoryObj } from '@storybook/nextjs'

import { LoginView } from '@/components/login/login-page'

const meta = {
  title: 'Screens/ログイン',
  component: LoginView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof LoginView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = {
  args: { returnPath: '/', identityProviderFailed: false },
}

export const IDプロバイダに到達できない: Story = {
  args: { returnPath: '/guide', identityProviderFailed: true },
}
