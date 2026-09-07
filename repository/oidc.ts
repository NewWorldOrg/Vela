import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'

export type OidcReach = components['schemas']['OidcReach']

export interface OidcConfig {
  configured: boolean
  discoveryUrl: string
  clientId: string
  secretHeld: boolean
  allowedGroups: string[]
  allowedHostedDomains: string[]
  admitsEveryone: boolean
  reach: OidcReach
  redirectUri: string
}

export interface OidcConfigChange {
  discoveryUrl: string
  clientId: string
  clientSecret?: string
  allowedGroups: string[]
  allowedHostedDomains: string[]
}

export type OidcSaveResult =
  { state: 'ok' } | { state: 'refused'; message: string }

export async function getOidcConfig(): Promise<OidcConfig> {
  const { data, response } = await carinaClient().GET('/api/auth/oidc-config')

  if (!response.ok || !data?.data) {
    throw new Error(`GET /api/auth/oidc-config answered ${response.status}`)
  }

  const held = data.data

  return {
    configured: held.configured,
    discoveryUrl: held.discoveryUrl ?? '',
    clientId: held.clientId ?? '',
    secretHeld: held.secretHeld,
    allowedGroups: held.allowedGroups,
    allowedHostedDomains: held.allowedHostedDomains,
    admitsEveryone: held.admitsEveryone,
    reach: held.reach,
    redirectUri: held.redirectUri,
  }
}

export async function saveOidcConfig(
  change: OidcConfigChange,
): Promise<OidcSaveResult> {
  const { data, error, response } = await carinaClient().PUT(
    '/api/auth/oidc-config',
    {
      body: {
        discoveryUrl: change.discoveryUrl,
        clientId: change.clientId,
        clientSecret: change.clientSecret ?? null,
        allowedGroups: change.allowedGroups,
        allowedHostedDomains: change.allowedHostedDomains,
      },
    },
  )

  if (response.ok && data?.data) {
    return { state: 'ok' }
  }

  return {
    state: 'refused',
    message: error?.message || `API は ${response.status} を返しました。`,
  }
}
