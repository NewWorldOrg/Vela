import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, within } from 'storybook/test'

import { oidcStartHref } from '@/repository/auth'
import { LoginView } from '@/components/login/login-page'
import { groundOf } from '@/stories/ground-of'

const meta = {
  title: 'Screens/ログイン',
  component: LoginView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof LoginView>

export default meta
type Story = StoryObj<typeof meta>

const LOCAL = 'ローカルアカウントでサインイン'

async function localSignInIs(
  canvasElement: HTMLElement,
  placement: 'lead' | 'expanded' | 'collapsed',
): Promise<void> {
  const canvas = within(canvasElement)
  const toggle = canvas.queryByRole('button', { name: LOCAL })

  if (placement === 'lead') {
    await expect(toggle).toBeNull()
  } else {
    await expect(toggle).toHaveAttribute(
      'aria-expanded',
      String(placement === 'expanded'),
    )
  }

  if (placement === 'collapsed') {
    await expect(canvas.queryByLabelText('ユーザー名')).toBeNull()
  } else {
    await expect(canvas.getByLabelText('ユーザー名')).toBeVisible()
    await expect(canvas.getByLabelText('パスワード')).toBeVisible()
  }
}

async function saysNothingIsWrong(canvasElement: HTMLElement): Promise<void> {
  await expect(canvasElement.querySelector('[data-slot="banner"]')).toBeNull()
}

async function bannerSays(
  canvasElement: HTMLElement,
  tone: 'danger' | 'warn',
  text: string,
): Promise<void> {
  const banners = canvasElement.querySelectorAll<HTMLElement>(
    '[data-slot="banner"]',
  )

  await expect(banners).toHaveLength(1)

  const [banner] = banners

  await expect(banner).toHaveAttribute('data-tone', tone)
  await expect(banner).toHaveAttribute(
    'role',
    tone === 'danger' ? 'alert' : 'status',
  )
  await expect(banner).toHaveTextContent(text)
  await expect(getComputedStyle(banner).backgroundColor).toBe(
    groundOf(
      canvasElement,
      tone === 'danger' ? 'bg-coral-soft' : 'bg-lemon-soft',
    ),
  )
}

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
  play: async ({ canvasElement }) => {
    await saysNothingIsWrong(canvasElement)
    await expect(
      within(canvasElement).getByRole('link', { name: 'SSO でサインイン' }),
    ).toHaveAttribute('href', oidcStartHref('/'))
    await localSignInIs(canvasElement, 'collapsed')
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
  play: async ({ canvasElement }) => {
    await saysNothingIsWrong(canvasElement)
    await expect(
      within(canvasElement).getByRole('link', {
        name: 'id.example.test でサインイン',
      }),
    ).toBeVisible()
    await localSignInIs(canvasElement, 'collapsed')
  },
}

export const OIDC未設定: Story = {
  args: {
    returnPath: '/',
    options: { state: 'local-only' },
    identityProviderFailed: false,
  },
  play: async ({ canvasElement }) => {
    await saysNothingIsWrong(canvasElement)
    await expect(within(canvasElement).queryByRole('link')).toBeNull()
    await localSignInIs(canvasElement, 'lead')
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
  play: async ({ canvasElement }) => {
    await bannerSays(
      canvasElement,
      'warn',
      '組織の ID プロバイダーに接続できません。',
    )
    await expect(
      within(canvasElement).getByRole('link', {
        name: 'id.example.test でサインイン',
      }),
    ).toHaveAttribute('href', oidcStartHref('/guide'))
    await localSignInIs(canvasElement, 'expanded')
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
  play: async ({ canvasElement }) => {
    await bannerSays(
      canvasElement,
      'danger',
      'サインインに失敗しました。もう一度お試しください。',
    )
    await localSignInIs(canvasElement, 'expanded')
  },
}

export const 失敗したうえにIDプロバイダにも届かないとき: Story = {
  args: {
    returnPath: '/guide',
    options: {
      state: 'identity-provider',
      providerName: 'id.example.test',
      reachable: false,
    },
    identityProviderFailed: true,
  },
  play: async ({ canvasElement }) => {
    await bannerSays(
      canvasElement,
      'danger',
      'サインインに失敗しました。もう一度お試しください。',
    )
    await localSignInIs(canvasElement, 'expanded')
  },
}
