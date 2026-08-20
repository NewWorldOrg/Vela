import type { AuthMethod } from '@/repository/auth'

export const AUTHENTICATION_PATH = '/settings/authentication'

/** The device whose session was just revoked, so the screen can name it once. */
export const REVOKED_KEY = 'revoked'

/** How many other sessions a password change ended. */
export const ENDED_KEY = 'ended'

export const METHOD_LABEL: Record<AuthMethod, string> = {
  local: 'ローカルアカウント',
  oidc: 'OIDC',
}

/** The line under the method, where the method needs one. */
export const METHOD_NOTE: Partial<Record<AuthMethod, string>> = {
  local: '外部プレイヤー用',
}

export function revokedHref(device: string): string {
  return `${AUTHENTICATION_PATH}?${REVOKED_KEY}=${encodeURIComponent(device)}`
}

export function passwordChangedHref(sessionsEnded: number): string {
  return `${AUTHENTICATION_PATH}?${ENDED_KEY}=${sessionsEnded}`
}
