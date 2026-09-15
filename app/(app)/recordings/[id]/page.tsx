import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getLatestEncodeJob, listEncodeChoices } from '@/repository/encode'
import {
  ENCODE_JOBS_EVENT,
  QUALITY_EVENT,
  RECORDINGS_EVENT,
} from '@/repository/events'
import { getRecording } from '@/repository/recordings'
import { getPlaybackPlan, getUnaskedPlaybackProfile } from '@/repository/videos'
import { RefreshOnSignal } from '@/components/vela/app-signals'
import { RecordingDetailView } from '@/components/recordings/recording-detail-page'
import { throwRecordingAway } from '@/app/(app)/library/actions'
import { callOffJob } from '@/app/(app)/settings/encode/actions'
import {
  askForTheSound,
  queueEncoding,
  redrawThumbnail,
  takeTicket,
} from './actions'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const detail = await getRecording(id)
  return { title: detail ? detail.title : 'ページが見つかりません' }
}

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
  const [detail, playback, unaskedProfile, encodeChoices, encodeJob] =
    await Promise.all([
      getRecording(id),
      getPlaybackPlan(id),
      getUnaskedPlaybackProfile(),
      listEncodeChoices(),
      getLatestEncodeJob(id),
    ])

  if (!detail) {
    notFound()
  }

  return (
    <>
      <RefreshOnSignal
        events={[RECORDINGS_EVENT, ENCODE_JOBS_EVENT, QUALITY_EVENT]}
      />
      <RecordingDetailView
        detail={detail}
        playback={playback}
        unaskedProfile={unaskedProfile}
        startAt={secondsIn(at)}
        onRemakeThumbnail={redrawThumbnail}
        onDelete={throwRecordingAway}
        onTakeTicket={takeTicket}
        onAskForTheSound={askForTheSound}
        onQueueEncode={queueEncoding}
        encodeChoices={encodeChoices}
        encodeJob={encodeJob}
        onCallOffEncode={callOffJob}
      />
    </>
  )
}
