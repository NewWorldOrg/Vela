import { describeDevice, type Device } from '@/lib/device'
import { formatDateTime } from '@/lib/format'
import type { AuthMethod } from '@/repository/auth'
import { carinaClient } from '@/repository/client/carina'

const MINUTE = 60_000

const HOUR = 60 * MINUTE

export interface Moment {
  label: string
  at?: string
}

export interface SessionRow {
  id: string
  displayName: string
  device: Device
  method: AuthMethod
  createdAt: string
  lastUsed: Moment
  current: boolean
}

export interface SignedIn {
  subject: string
  method: AuthMethod
}

export type RevokeResult =
  | { state: 'ok' }
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
