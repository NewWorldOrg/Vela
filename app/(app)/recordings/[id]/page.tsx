import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'

import {
  getLatestEncodeJob,
  getStandingArtefact,
  listEncodeChoices,
} from '@/repository/encode'
import {
  ENCODE_JOBS_EVENT,
  QUALITY_EVENT,
  RECORDINGS_EVENT,
} from '@/repository/events'
import { getRecording } from '@/repository/recordings'
import { DECODES_COOKIE, decodesOf } from '@/lib/browser-decodes'
import { isRecordingId } from '@/lib/recordings'
import { getPlaybackPlan, getUnaskedPlaybackProfile } from '@/repository/videos'
import { theHoldAsked, theSourceAsked } from '@/lib/playback-source'
import { RefreshOnSignal } from '@/components/vela/app-signals'
import { RecordingDetailView } from '@/components/recordings/recording-detail-page'
import { throwRecordingAway } from '@/app/(app)/library/actions'
import { callOffJob } from '@/app/(app)/settings/encode/actions'
import {
  askForTheSound,
  askWhichArtefact,
  keepThePosition,
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
  const detail = isRecordingId(id) ? await getRecording(id) : undefined
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
  searchParams: Promise<{
    at?: string | string[]
    paused?: string | string[]
    source?: string | string[]
  }>
}) {
  const { id } = await params
  const { at, paused, source } = await searchParams

  if (!isRecordingId(id)) {
    notFound()
  }

  const decodes = decodesOf((await cookies()).get(DECODES_COOKIE)?.value)

  const [detail, playback, unaskedProfile, encodeChoices, encodeJob, artefact] =
    await Promise.all([
      getRecording(id),
      getPlaybackPlan(id, undefined, theSourceAsked(source), decodes),
      getUnaskedPlaybackProfile(),
      listEncodeChoices(),
      getLatestEncodeJob(id),
      getStandingArtefact(id).catch((error: unknown) => {
        console.warn(
          '[recording] the standing artefact was not read',
          id,
          error,
        )

        return undefined
      }),
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
        startsHeld={theHoldAsked(paused)}
        onRemakeThumbnail={redrawThumbnail}
        onDelete={throwRecordingAway}
        onTakeTicket={takeTicket}
        onAskForTheSound={askForTheSound}
        onKeepPosition={keepThePosition}
        artefact={artefact}
        onAskWhichArtefact={askWhichArtefact}
        onQueueEncode={queueEncoding}
        encodeChoices={encodeChoices}
        encodeJob={encodeJob}
        onCallOffEncode={callOffJob}
      />
    </>
  )
}
