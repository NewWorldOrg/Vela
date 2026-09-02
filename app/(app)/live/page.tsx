import type { Metadata } from 'next'

import { getLiveScreen } from '@/repository/live'
import { LiveView } from '@/components/live/live-page'

export const metadata: Metadata = { title: 'ライブ' }

function one(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const screen = await getLiveScreen(one(params.kind), one(params.ch))

  return <LiveView screen={screen} />
}
