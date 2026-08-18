import type { Metadata } from 'next'

import { LoginView } from '@/components/login/login-page'

export const metadata: Metadata = { title: 'サインイン' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams

  return <LoginView failed={params.error !== undefined} />
}
