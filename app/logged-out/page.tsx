import type { Metadata } from 'next'

import { SIGNED_OUT_METHOD_KEY, signedOutMethod } from '@/repository/auth'
import { LoggedOutView } from '@/components/login/logged-out-page'

export const metadata: Metadata = { title: 'ログアウトしました' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const method = params[SIGNED_OUT_METHOD_KEY]

  return (
    <LoggedOutView
      method={signedOutMethod(typeof method === 'string' ? method : undefined)}
    />
  )
}
