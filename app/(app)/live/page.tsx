import type { Metadata } from 'next'
import { cookies } from 'next/headers'

import {
  AUTO_OPEN_SPELLING,
  DATA_BROADCAST_AUTO_OPEN,
  FOLD_SPELLING,
  LIVE_CHANNELS_FOLDED,
  LIVE_SUB_CHANNELS_FOLDED,
  flagOf,
} from '@/lib/stored-flag'
import { CAPTION_STYLE_COOKIE, captionStyleOf } from '@/lib/caption-style'
import { FORMAT_COOKIE, formatChoiceOf } from '@/lib/playback-format'
import { EPG_COLLECTION_EVENT, PROGRAMS_EVENT } from '@/repository/events'
import { getLiveScreen } from '@/repository/live'
import { RefreshOnSignal } from '@/components/vela/app-signals'
import { LiveView } from '@/components/live/live-page'
import { recordTheProgramme, takeTheRecordingBack, takeTicket } from './actions'

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
        onRecord={recordTheProgramme}
        onTakeTheRecordingBack={takeTheRecordingBack}
        channelsFolded={flagOf(
          jar.get(LIVE_CHANNELS_FOLDED)?.value,
          FOLD_SPELLING,
        )}
        subChannelsFolded={flagOf(
          jar.get(LIVE_SUB_CHANNELS_FOLDED)?.value,
          FOLD_SPELLING,
        )}
        autoOpensDataBroadcast={flagOf(
          jar.get(DATA_BROADCAST_AUTO_OPEN)?.value,
          AUTO_OPEN_SPELLING,
        )}
        captionStyle={captionStyleOf(jar.get(CAPTION_STYLE_COOKIE)?.value)}
        formatChoice={formatChoiceOf(jar.get(FORMAT_COOKIE)?.value)}
      />
    </>
  )
}
