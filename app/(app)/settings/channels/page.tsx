import type { Metadata } from 'next'

import { getChannels } from '@/repository/services'
import { ChannelsView } from '@/components/channels/channels-page'
import {
  addCandidate,
  beginScan,
  removeCandidate,
  selectChannel,
  stopScan,
} from './actions'

export const metadata: Metadata = { title: 'チャンネル' }

export default async function Page() {
  const result = await getChannels()

  return (
    <ChannelsView
      result={result}
      onStart={beginScan}
      onCancel={stopScan}
      onSelect={selectChannel}
      onAdd={addCandidate}
      onDelete={removeCandidate}
    />
  )
}
