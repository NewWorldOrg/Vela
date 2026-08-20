import type { Metadata } from 'next'

import { getOidcConfig } from '@/repository/oidc'
import { getSessions, getSignedIn } from '@/repository/sessions'
import type { AuthenticationNotice } from '@/components/authentication/authentication-page'
import { AuthenticationView } from '@/components/authentication/authentication-page'
import { ENDED_KEY, REVOKED_KEY } from '@/components/authentication/wording'
import {
  changeLocalPassword,
  revokeOneSession,
  saveIdentityProvider,
} from './actions'

export const metadata: Metadata = { title: '認証' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [asked, sessions, signedIn, oidc] = await Promise.all([
    searchParams,
    getSessions(),
    getSignedIn(),
    getOidcConfig(),
  ])

  return (
    <AuthenticationView
      sessions={sessions}
      signedIn={signedIn}
      oidc={oidc}
      notice={noticeIn(asked)}
      onRevoke={revokeOneSession}
      onChangePassword={changeLocalPassword}
      onSaveOidc={saveIdentityProvider}
    />
  )
}

function noticeIn(
  asked: Record<string, string | string[] | undefined>,
): AuthenticationNotice | undefined {
  const revoked = onlyOne(asked[REVOKED_KEY])

  if (revoked) {
    return { kind: 'revoked', device: revoked }
  }

  const ended = Number.parseInt(onlyOne(asked[ENDED_KEY]) ?? '', 10)

  return Number.isFinite(ended) && ended >= 0
    ? { kind: 'password', sessionsEnded: ended }
    : undefined
}

function onlyOne(value: string | string[] | undefined): string | undefined {
  const asked = Array.isArray(value) ? value[0] : value

  return asked && asked.length > 0 ? asked : undefined
}
