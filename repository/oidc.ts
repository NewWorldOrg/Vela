import { TRY_AGAIN_LATER } from '@/lib/try-again'
import { shapeFor } from '@/lib/not-yet-in-this-build'
import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'

type OidcConfigRefusal = components['schemas']['OidcConfigRefusal']

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
    message: refusalOf(
      error?.data && 'refusal' in error.data ? error.data.refusal : undefined,
      response.status,
    ),
  }
}

const OIDC_REFUSAL: Record<OidcConfigRefusal, string> = {
  secretRequired: '初めての保存には client secret が必要です。',
  discoveryUrlInvalid:
    'discovery URL が https で始まる URL ではないか、長すぎます。',
  clientIdInvalid: 'client ID が空か、長すぎます。',
  restrictionInvalid:
    '許可グループか許可ドメインに、受け付けられない値が含まれています。',
  providerUnreachable:
    'discovery の文書を読めなかったため、何も保存されていません。表示されている redirect URI を IdP に登録してから、discovery URL を確かめてください。',
}

function refusalOf(
  refusal: OidcConfigRefusal | undefined,
  status: number,
): string {
  const fallback = TRY_AGAIN_LATER

  return refusal === undefined
    ? fallback
    : shapeFor(OIDC_REFUSAL, refusal, fallback)
}
