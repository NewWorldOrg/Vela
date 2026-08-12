import type { Metadata } from 'next'

import { getChannels } from '@/repository/tuners'
import { ChannelsView } from '@/page-component/settings/channels-view'

export const metadata: Metadata = { title: 'チャンネル' }

export default async function Page() {
  const result = await getChannels()

  return <ChannelsView result={result} />
}
