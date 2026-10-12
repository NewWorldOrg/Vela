import type { Metadata } from 'next'
import { cookies } from 'next/headers'

import { viewingSettingsOf } from '@/lib/viewing'
import { ViewingView } from '@/components/viewing/viewing-page'

export const metadata: Metadata = { title: '視聴' }

export default async function Page() {
  const jar = await cookies()

  return <ViewingView {...viewingSettingsOf((key) => jar.get(key)?.value)} />
}
