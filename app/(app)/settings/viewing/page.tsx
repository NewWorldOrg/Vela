import type { Metadata } from 'next'
import { cookies } from 'next/headers'

import {
  AUTO_OPEN_SPELLING,
  DATA_BROADCAST_AUTO_OPEN,
  flagOf,
} from '@/lib/stored-flag'
import { ViewingView } from '@/components/viewing/viewing-page'

export const metadata: Metadata = { title: '視聴' }

export default async function Page() {
  const jar = await cookies()

  return (
    <ViewingView
      autoOpensDataBroadcast={flagOf(
        jar.get(DATA_BROADCAST_AUTO_OPEN)?.value,
        AUTO_OPEN_SPELLING,
      )}
    />
  )
}
