import type { Metadata } from 'next'
import { cookies } from 'next/headers'

import {
  FOLD_SPELLING,
  LIVE_CHANNELS_FOLDED,
  LIVE_SUB_CHANNELS_FOLDED,
  flagOf,
} from '@/lib/stored-flag'
import { EPG_COLLECTION_EVENT, PROGRAMS_EVENT } from '@/repository/events'
import { getLiveScreen } from '@/repository/live'
import { RefreshOnSignal } from '@/components/vela/app-signals'
import { LiveView } from '@/components/live/live-page'
import { takeTicket } from './actions'

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
  const jar = await cookies()
  const screen = await getLiveScreen(one(params.kind), one(params.ch))

  return (
    <>
      <RefreshOnSignal events={[PROGRAMS_EVENT, EPG_COLLECTION_EVENT]} />
      <LiveView
        screen={screen}
        onTakeTicket={takeTicket}
        channelsFolded={flagOf(
          jar.get(LIVE_CHANNELS_FOLDED)?.value,
          FOLD_SPELLING,
        )}
        subChannelsFolded={flagOf(
          jar.get(LIVE_SUB_CHANNELS_FOLDED)?.value,
          FOLD_SPELLING,
        )}
      />
    </>
  )
}
