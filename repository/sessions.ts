import { describeDevice, type Device } from '@/lib/device'
import { formatDateTime } from '@/lib/format'
import type { AuthMethod } from '@/repository/auth'
import { carinaClient } from '@/repository/client/carina'

const MINUTE = 60_000

const HOUR = 60 * MINUTE

/** When a moment is recent, how long ago it was, and the stamp behind it. */
export interface Moment {
  label: string
  /** Absent when the label already is the stamp. */
  at?: string
}

/** One signed-in device, as the settings screen spells it. */
export interface SessionRow {
  id: string
  /**
   * Whose session it is, as the API wrote it when the session was made: the
   * username of a local account, or what the identity provider said — its
   * email, failing that its name, failing that the subject it handed.
   */
  displayName: string
  device: Device
  method: AuthMethod
  createdAt: string
  lastUsed: Moment
  /** The device reading this page. It is signed out, never revoked. */
  current: boolean
}

/**
 * Who the session in hand belongs to. A local session names the account, which
 * is the only place its username can be read; an OIDC one names the subject
 * the identity provider gave.
 */
export interface SignedIn {
  subject: string
  method: AuthMethod
}

export type RevokeResult =
  | { state: 'ok' }
  /** The session had already ended, so the list was simply out of date. */
  | { state: 'gone' }
  | { state: 'unavailable'; message: string }

export type PasswordResult =
  { state: 'ok'; sessionsEnded: number } | { state: 'refused'; message: string }

export interface PasswordChange {
  currentPassword: string
  newPassword: string
}

export async function getSessions(): Promise<SessionRow[]> {
  const { data, response } = await carinaClient().GET('/api/auth/sessions')

  if (!response.ok || !data?.data) {
    throw new Error(`GET /api/auth/sessions answered ${response.status}`)
  }

  const now = Date.now()

  return data.data.map((session) => ({
    id: session.id,
    displayName: session.displayName,
    device: describeDevice(session.deviceLabel),
    method: session.method,
    createdAt: formatDateTime(session.createdAt),
    lastUsed: momentOf(session.lastUsedAt, now),
    current: session.current,
  }))
}

export async function getSignedIn(): Promise<SignedIn> {
  const { data, response } = await carinaClient().GET('/api/auth/me')

  if (!response.ok || !data?.data) {
    throw new Error(`GET /api/auth/me answered ${response.status}`)
  }

  return { subject: data.data.subject, method: data.data.method }
}

export async function revokeSession(id: string): Promise<RevokeResult> {
  const { error, response } = await carinaClient().DELETE(
    '/api/auth/sessions/{id}',
    { params: { path: { id } } },
  )

  if (response.status === 204) {
    return { state: 'ok' }
  }

  if (response.status === 404) {
    return { state: 'gone' }
  }

  return {
    state: 'unavailable',
    message: error?.message || `API は ${response.status} を返しました。`,
  }
}

export async function changePassword(
  change: PasswordChange,
): Promise<PasswordResult> {
  const { data, error, response } = await carinaClient().POST(
    '/api/auth/password',
    { body: change },
  )

  const changed = data?.data

  if (response.ok && changed) {
    return { state: 'ok', sessionsEnded: Number(changed.sessionsEnded) }
  }

  return {
    state: 'refused',
    message: error?.message || `API は ${response.status} を返しました。`,
  }
}

function momentOf(iso: string, now: number): Moment {
  const elapsed = now - Date.parse(iso)

  if (elapsed < MINUTE) {
    return { label: 'たったいま' }
  }

  if (elapsed < HOUR) {
    return {
      label: `約 ${Math.round(elapsed / MINUTE)} 分前`,
      at: formatDateTime(iso),
    }
  }

  return { label: formatDateTime(iso) }
}
