import type { Metadata } from 'next'
import { cookies } from 'next/headers'

import { viewingSettingsOf } from '@/lib/viewing'
import { getResidence } from '@/repository/data-broadcast-settings'
import { ViewingView } from '@/components/viewing/viewing-page'
import { settleTheResidence } from './actions'

export const metadata: Metadata = { title: '視聴' }

export default async function Page() {
  const [jar, residence] = await Promise.all([cookies(), getResidence()])

  return (
    <ViewingView
      {...viewingSettingsOf((key) => jar.get(key)?.value)}
      residence={residence}
      onSettleResidence={settleTheResidence}
    />
  )
}
