import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, within } from 'storybook/test'

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

export const SSOで入ると最初の画面で幕が上がる: Story = {
  args: 通常.args,
  play: async ({ canvasElement }) => {
    window.sessionStorage.removeItem('vela.curtain')
    canvasElement.addEventListener('click', (event) => event.preventDefault(), {
      capture: true,
      once: true,
    })

    await userEvent.click(
      within(canvasElement).getByRole('link', { name: 'SSO でサインイン' }),
    )

    await expect(window.sessionStorage.getItem('vela.curtain')).toBe('raise')
    window.sessionStorage.removeItem('vela.curtain')
  },
}
