import type { Metadata } from 'next'

import { EPG_COLLECTION_EVENT, PROGRAMS_EVENT } from '@/repository/events'
import { getLiveScreen } from '@/repository/live'
import { RefreshOnSignal } from '@/components/vela/app-signals'
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

  return (
    <>
      <RefreshOnSignal events={[PROGRAMS_EVENT, EPG_COLLECTION_EVENT]} />
      <LiveView screen={screen} />
    </>
  )
}
