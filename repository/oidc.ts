import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'

/** Whether the identity provider answers, and whether one is set up at all. */
export type OidcReach = components['schemas']['OidcReach']

export interface OidcConfig {
  configured: boolean
  discoveryUrl: string
  clientId: string
  /**
   * The client secret is write-only: the API answers whether it holds one and
   * never what it is, so a form can only offer to replace it.
   */
  secretHeld: boolean
  allowedGroups: string[]
  allowedHostedDomains: string[]
  /** Nothing narrows who may sign in, so everyone in the tenant gets through. */
  admitsEveryone: boolean
  reach: OidcReach
  /** What has to be registered with the identity provider before any of this works. */
  redirectUri: string
}

export interface OidcConfigChange {
  discoveryUrl: string
  clientId: string
  /** Sent only when a new one was typed in; absent leaves the held one alone. */
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
