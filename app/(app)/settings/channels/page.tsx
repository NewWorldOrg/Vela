import type { Metadata } from 'next'

import { getChannelScan } from '@/repository/tuners'
import { ChannelsView } from '@/page-component/settings/channels-view'

export const metadata: Metadata = { title: 'チャンネル' }

export default async function Page() {
  const result = await getChannelScan()

  return <ChannelsView result={result} />
}
