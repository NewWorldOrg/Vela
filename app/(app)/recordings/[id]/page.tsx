import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { listEncodeChoices } from '@/repository/encode'
import { getRecording } from '@/repository/recordings'
import { getPlaybackPlan } from '@/repository/videos'
import { RecordingDetailView } from '@/components/recordings/recording-detail-page'
import { throwRecordingAway } from '@/app/(app)/library/actions'
import { queueEncoding, redrawThumbnail, takeTicket } from './actions'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const detail = await getRecording(id)
  return { title: detail ? detail.title : 'ページが見つかりません' }
}

/**
 * The second the page opens at. The quality panel sends the reader to a drop
 * by putting it here, and the library's 再生 sends them to the start, which is
 * the state a second reader opening the link would need and a reload has to
 * bring back. Nothing asked is the page opened to read, with the picture
 * waiting for a press.
 */
function secondsIn(asked: string | string[] | undefined) {
  const read = Number(Array.isArray(asked) ? asked[0] : asked)

  return Number.isFinite(read) && read >= 0 ? Math.floor(read) : undefined
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ at?: string | string[] }>
}) {
  const { id } = await params
  const { at } = await searchParams
  const [detail, playback, encodeChoices] = await Promise.all([
    getRecording(id),
    getPlaybackPlan(id),
    listEncodeChoices(),
  ])

  if (!detail) {
    notFound()
  }

  return (
    <RecordingDetailView
      detail={detail}
      playback={playback}
      startAt={secondsIn(at)}
      onRemakeThumbnail={redrawThumbnail}
      onDelete={throwRecordingAway}
      onTakeTicket={takeTicket}
      onQueueEncode={queueEncoding}
      encodeChoices={encodeChoices}
    />
  )
}
