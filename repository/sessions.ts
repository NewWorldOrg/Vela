import { describeDevice, type Device } from '@/lib/device'
import { formatMoment } from '@/lib/format'
import type { AuthMethod } from '@/repository/auth'
import { shapeFor } from '@/lib/not-yet-in-this-build'
import { TRY_AGAIN_LATER } from '@/lib/try-again'
import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'

export { onwardIfSignedIn } from '@/repository/client/carina'

type PasswordRefusedResponder =
  components['schemas']['PasswordRefusedResponder']

export interface SessionRow {
  id: string
  displayName: string
  device: Device
  method: AuthMethod
  createdAt: string
  lastUsedAt: string
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

  return data.data.map((session) => ({
    id: session.id,
    displayName: session.displayName,
    device: describeDevice(session.deviceLabel),
    method: session.method,
    createdAt: formatMoment(session.createdAt),
    lastUsedAt: formatMoment(session.lastUsedAt),
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
  const { response } = await carinaClient().DELETE('/api/auth/sessions/{id}', {
    params: { path: { id } },
  })

  if (response.status === 204) {
    return { state: 'ok' }
  }

  if (response.status === 404) {
    return { state: 'gone' }
  }

  return {
    state: 'unavailable',
    message: TRY_AGAIN_LATER,
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
    message: passwordRefusalOf(
      error?.data && 'refusal' in error.data ? error.data : undefined,
      response.status,
    ),
  }
}

const PASSWORD_REFUSAL: Record<
  PasswordRefusedResponder['refusal'],
  (refused: PasswordRefusedResponder) => string
> = {
  wrongPassword: () => 'いまのパスワードが一致しません。',
  outOfLength: (refused) =>
    `新しいパスワードは ${Number(refused.shortestLength)}〜${Number(refused.longestLength)} 文字です。`,
}

function passwordRefusalOf(
  refused: PasswordRefusedResponder | undefined,
  status: number,
): string {
  const fallback = TRY_AGAIN_LATER

  return refused === undefined
    ? fallback
    : shapeFor(PASSWORD_REFUSAL, refused.refusal, () => fallback)(refused)
}
