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

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>
}) {
  const [result, { open }] = await Promise.all([getChannels(), searchParams])

  return (
    <ChannelsView
      result={result}
      open={open}
      onStart={beginScan}
      onCancel={stopScan}
      onSelect={selectChannel}
      onAdd={addCandidate}
      onDelete={removeCandidate}
    />
  )
}
