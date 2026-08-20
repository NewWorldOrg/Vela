'use server'

import { revalidatePath } from 'next/cache'

import type { OidcConfigChange, OidcSaveResult } from '@/repository/oidc'
import { saveOidcConfig } from '@/repository/oidc'
import type {
  PasswordChange,
  PasswordResult,
  RevokeResult,
} from '@/repository/sessions'
import { changePassword, revokeSession } from '@/repository/sessions'
import { AUTHENTICATION_PATH } from '@/components/authentication/wording'

export async function revokeOneSession(id: string): Promise<RevokeResult> {
  const result = await revokeSession(id)

  if (result.state !== 'unavailable') {
    revalidatePath(AUTHENTICATION_PATH)
  }

  return result
}

export async function changeLocalPassword(
  change: PasswordChange,
): Promise<PasswordResult> {
  const result = await changePassword(change)

  if (result.state === 'ok') {
    revalidatePath(AUTHENTICATION_PATH)
  }

  return result
}

export async function saveIdentityProvider(
  change: OidcConfigChange,
): Promise<OidcSaveResult> {
  const result = await saveOidcConfig(change)

  if (result.state === 'ok') {
    revalidatePath(AUTHENTICATION_PATH)
  }

  return result
}
