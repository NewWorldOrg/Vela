import type { AuthMethod } from '@/repository/auth'

export const AUTHENTICATION_PATH = '/settings/authentication'

export const REVOKED_KEY = 'revoked'

export const ENDED_KEY = 'ended'

export const METHOD_LABEL: Record<AuthMethod, string> = {
  local: 'ローカルアカウント',
  oidc: 'OIDC',
}

export function revokedHref(device: string): string {
  return `${AUTHENTICATION_PATH}?${REVOKED_KEY}=${encodeURIComponent(device)}`
}

export function passwordChangedHref(sessionsEnded: number): string {
  return `${AUTHENTICATION_PATH}?${ENDED_KEY}=${sessionsEnded}`
}
