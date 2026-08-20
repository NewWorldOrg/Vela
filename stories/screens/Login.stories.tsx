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
  args: {
    returnPath: '/',
    options: {
      state: 'identity-provider',
      providerName: null,
      reachable: true,
    },
    identityProviderFailed: false,
  },
}

export const IDプロバイダの表示名があるとき: Story = {
  args: {
    returnPath: '/',
    options: {
      state: 'identity-provider',
      providerName: 'id.example.test',
      reachable: true,
    },
    identityProviderFailed: false,
  },
}

export const OIDC未設定: Story = {
  args: {
    returnPath: '/',
    options: { state: 'local-only' },
    identityProviderFailed: false,
  },
}

export const IDプロバイダに接続できない: Story = {
  args: {
    returnPath: '/guide',
    options: {
      state: 'identity-provider',
      providerName: 'id.example.test',
      reachable: false,
    },
    identityProviderFailed: false,
  },
}

export const サインインに失敗したあと: Story = {
  args: {
    returnPath: '/guide',
    options: {
      state: 'identity-provider',
      providerName: null,
      reachable: true,
    },
    identityProviderFailed: true,
  },
}
