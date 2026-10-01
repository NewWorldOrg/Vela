import { formatMoment } from '@/lib/format'
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

const SEEN_ON = Date.parse('2026-08-19T02:47:00Z')

function at(iso: string): string {
  return formatMoment(iso, SEEN_ON)
}

const THIS_DEVICE: SessionRow = {
  id: 'session-this-device',
  displayName: 'aki@example.test',
  device: { name: 'Chrome / Windows', kind: 'デスクトップ' },
  method: 'oidc',
  createdAt: at('2026-08-18T00:12:00Z'),
  lastUsedAt: at('2026-08-19T02:46:40Z'),
  current: true,
}

export const SESSIONS: SessionRow[] = [
  THIS_DEVICE,
  {
    id: 'session-tablet',
    displayName: 'aki@example.test',
    device: { name: 'Safari / iPadOS 18', kind: 'タブレット' },
    method: 'oidc',
    createdAt: at('2026-08-16T12:40:00Z'),
    lastUsedAt: at('2026-08-19T02:44:00Z'),
    current: false,
  },
  {
    id: 'session-laptop',
    displayName: 'nao@example.test',
    device: { name: 'Firefox / macOS', kind: 'デスクトップ' },
    method: 'oidc',
    createdAt: at('2026-08-11T23:05:00Z'),
    lastUsedAt: at('2026-08-17T13:18:00Z'),
    current: false,
  },
  {
    id: 'session-player',
    displayName: 'operator',
    device: { name: 'VLC / iPadOS 18', kind: '外部プレイヤー' },
    method: 'local',
    createdAt: at('2026-08-10T10:33:00Z'),
    lastUsedAt: at('2026-08-18T21:02:00Z'),
    current: false,
  },
]

export const ONLY_THIS_DEVICE: SessionRow[] = [THIS_DEVICE]

export const MORE_SESSIONS_THAN_FIT: SessionRow[] = [
  THIS_DEVICE,
  ...Array.from({ length: 12 }, (_, round) =>
    SESSIONS.filter((session) => !session.current).map((session) => ({
      ...session,
      id: `${session.id}-${round}`,
      createdAt: at(`2026-07-${String(1 + round).padStart(2, '0')}T12:40:00Z`),
      lastUsedAt: at(`2026-08-${String(1 + round).padStart(2, '0')}T02:44:00Z`),
    })),
  ).flat(),
]

export const LONG_NAMES: SessionRow[] = [
  THIS_DEVICE,
  {
    id: 'session-long-address',
    displayName:
      'someone.with.a.rather.long.name@accounts.subdomain.example.test',
    device: { name: 'Safari / iPadOS 18', kind: 'タブレット' },
    method: 'oidc',
    createdAt: at('2026-08-16T12:40:00Z'),
    lastUsedAt: at('2026-08-19T02:44:00Z'),
    current: false,
  },
  {
    id: 'session-still-a-subject',
    displayName: 'k3Jr9vQm2LZp8xWc4TnB7yHd0sFq6aUe1oGiRtYlMwK',
    device: { name: 'Firefox / macOS', kind: 'デスクトップ' },
    method: 'oidc',
    createdAt: at('2026-08-11T23:05:00Z'),
    lastUsedAt: at('2026-08-17T13:18:00Z'),
    current: false,
  },
]

export const OIDC_UNCONFIGURED: OidcConfig = {
  configured: false,
  discoveryUrl: '',
  clientId: '',
  secretHeld: false,
  secretLost: false,
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
  secretLost: false,
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

export const OIDC_SECRET_LOST: OidcConfig = {
  ...OIDC_REACHABLE,
  configured: false,
  secretHeld: false,
  secretLost: true,
  reach: 'notConfigured',
}

export const OIDC_OUT_OF_REACH: OidcConfig = {
  ...OIDC_REACHABLE,
  reach: 'outOfReach',
}
