import type { Metadata } from 'next'

import {
  IDENTITY_PROVIDER_FAILED,
  RETURN_KEY,
  SIGN_IN_ERROR_KEY,
  getSignInOptions,
  returnPathWithin,
  type SignInOptions,
} from '@/repository/auth'
import { LoginView } from '@/components/login/login-page'

export const metadata: Metadata = { title: 'サインイン' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const next = params[RETURN_KEY]
  const error = params[SIGN_IN_ERROR_KEY]
  const options: SignInOptions = await getSignInOptions()

  return (
    <LoginView
      returnPath={returnPathWithin(typeof next === 'string' ? next : undefined)}
      options={options}
      identityProviderFailed={error === IDENTITY_PROVIDER_FAILED}
    />
  )
}
