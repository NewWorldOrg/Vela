import type { Meta, StoryObj } from '@storybook/nextjs'

import {
  OIDC_ADMITS_EVERYONE,
  OIDC_OUT_OF_REACH,
  OIDC_REACHABLE,
  OIDC_UNCONFIGURED,
  ONLY_THIS_DEVICE,
  SESSIONS,
  SIGNED_IN_LOCALLY,
  SIGNED_IN_WITH_A_PROVIDER,
} from '@/repository/authentication.fixtures'
import { AuthenticationView } from '@/components/authentication/authentication-page'

const meta = {
  title: 'Screens/設定・認証',
  component: AuthenticationView,
  parameters: { layout: 'fullscreen' },
  args: {
    sessions: SESSIONS,
    signedIn: SIGNED_IN_WITH_A_PROVIDER,
    oidc: OIDC_REACHABLE,
    onRevoke: async () => ({ state: 'ok' }) as const,
    onChangePassword: async () => ({ state: 'ok', sessionsEnded: 3 }) as const,
    onSaveOidc: async () => ({ state: 'ok' }) as const,
  },
} satisfies Meta<typeof AuthenticationView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = {}

export const いまの端末のみ: Story = { args: { sessions: ONLY_THIS_DEVICE } }

export const 失効直後: Story = {
  args: { notice: { kind: 'revoked', device: 'Safari / iPadOS 18' } },
}

export const パスワード変更直後: Story = {
  args: {
    sessions: ONLY_THIS_DEVICE,
    signedIn: SIGNED_IN_LOCALLY,
    notice: { kind: 'password', sessionsEnded: 3 },
  },
}

export const OIDC未設定: Story = {
  args: {
    sessions: ONLY_THIS_DEVICE,
    signedIn: SIGNED_IN_LOCALLY,
    oidc: OIDC_UNCONFIGURED,
  },
}

export const 絞り込み未設定: Story = { args: { oidc: OIDC_ADMITS_EVERYONE } }

export const IDプロバイダに到達できない: Story = {
  args: { oidc: OIDC_OUT_OF_REACH },
}
