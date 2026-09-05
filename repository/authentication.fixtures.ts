import type { OidcConfig } from '@/repository/oidc'
import type { SessionRow, SignedIn } from '@/repository/sessions'

export const SIGNED_IN_LOCALLY: SignedIn = {
  subject: 'operator',
  method: 'local',
}

export const SIGNED_IN_WITH_A_PROVIDER: SignedIn = {
  subject: 'a1b2c3d4-0000-4000-8000-000000000000',
  method: 'oidc',
}

const THIS_DEVICE: SessionRow = {
  id: 'session-this-device',
  device: { name: 'Chrome / Windows', kind: 'デスクトップ' },
  method: 'oidc',
  createdAt: '2026/08/18 09:12',
  lastUsed: { label: 'たったいま' },
  current: true,
}

export const SESSIONS: SessionRow[] = [
  THIS_DEVICE,
  {
    id: 'session-tablet',
    device: { name: 'Safari / iPadOS 18', kind: 'タブレット' },
    method: 'oidc',
    createdAt: '2026/08/16 21:40',
    lastUsed: { label: '約 3 分前', at: '2026/08/19 11:44' },
    current: false,
  },
  {
    id: 'session-laptop',
    device: { name: 'Firefox / macOS', kind: 'デスクトップ' },
    method: 'oidc',
    createdAt: '2026/08/12 08:05',
    lastUsed: { label: '2026/08/17 22:18' },
    current: false,
  },
  {
    id: 'session-player',
    device: { name: 'VLC / iPadOS 18', kind: '外部プレイヤー' },
    method: 'local',
    createdAt: '2026/08/10 19:33',
    lastUsed: { label: '2026/08/19 06:02' },
    current: false,
  },
]

export const ONLY_THIS_DEVICE: SessionRow[] = [THIS_DEVICE]

/** More sessions than a window holds: the other devices, signed in again and again. */
export const MORE_SESSIONS_THAN_FIT: SessionRow[] = [
  THIS_DEVICE,
  ...Array.from({ length: 12 }, (_, round) =>
    SESSIONS.filter((session) => !session.current).map((session) => ({
      ...session,
      id: `${session.id}-${round}`,
      createdAt: `2026/07/${String(1 + round).padStart(2, '0')} 21:40`,
      lastUsed: {
        label: `2026/08/${String(1 + round).padStart(2, '0')} 11:44`,
      },
    })),
  ).flat(),
]

export const OIDC_UNCONFIGURED: OidcConfig = {
  configured: false,
  discoveryUrl: '',
  clientId: '',
  secretHeld: false,
  allowedGroups: [],
  allowedHostedDomains: [],
  admitsEveryone: true,
  reach: 'notConfigured',
  redirectUri: 'https://vela.example.test/api/auth/oidc/callback',
}

export const OIDC_REACHABLE: OidcConfig = {
  configured: true,
  discoveryUrl:
    'https://id.example.test/common/v2.0/.well-known/openid-configuration',
  clientId: '00000000-1111-4222-8333-444444444444',
  secretHeld: true,
  allowedGroups: ['00000000-aaaa-4bbb-8ccc-dddddddddddd'],
  allowedHostedDomains: [],
  admitsEveryone: false,
  reach: 'reachable',
  redirectUri: 'https://vela.example.test/api/auth/oidc/callback',
}

export const OIDC_ADMITS_EVERYONE: OidcConfig = {
  ...OIDC_REACHABLE,
  allowedGroups: [],
  admitsEveryone: true,
}

export const OIDC_OUT_OF_REACH: OidcConfig = {
  ...OIDC_REACHABLE,
  reach: 'outOfReach',
}
