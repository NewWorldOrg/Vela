import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getRecording } from '@/repository/recordings'
import { getPlaybackPlan } from '@/repository/videos'
import { RecordingDetailView } from '@/components/recordings/recording-detail-page'
import { throwRecordingAway } from '@/app/(app)/library/actions'
import { redrawThumbnail, takeTicket } from './actions'

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
 * by putting it here, which is the state a second reader opening the link
 * would need and a reload has to bring back.
 */
function secondsIn(asked: string | string[] | undefined) {
  const read = Number(Array.isArray(asked) ? asked[0] : asked)

  return Number.isFinite(read) && read > 0 ? Math.floor(read) : undefined
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
  const [detail, playback] = await Promise.all([
    getRecording(id),
    getPlaybackPlan(id),
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
    />
  )
}
