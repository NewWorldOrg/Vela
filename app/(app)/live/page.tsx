import type { Metadata } from 'next'

import { getLive } from '@/repository/live'
import { LiveView } from '@/components/live/live-page'

export const metadata: Metadata = { title: 'ライブ' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const live = await getLive(
    typeof params.ch === 'string' ? params.ch : undefined,
  )

  return <LiveView live={live} />
}
