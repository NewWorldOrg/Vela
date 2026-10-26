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
import { getSegmentModelVersion } from '@/repository/recording-segments'
import { DECODES_COOKIE, decodesOf } from '@/lib/browser-decodes'
import { CAPTION_STYLE_COOKIE, captionStyleOf } from '@/lib/caption-style'
import { FORMAT_COOKIE, formatChoiceOf } from '@/lib/playback-format'
import {
  AUTO_OPEN_SPELLING,
  DATA_BROADCAST_AUTO_OPEN,
  flagOf,
} from '@/lib/stored-flag'
import { isRecordingId } from '@/lib/recordings'
import {
  decodesCarinaTakes,
  getPlaybackPlan,
  getPlaybackProfiles,
  getUnaskedPlaybackProfile,
} from '@/repository/videos'
import { theHoldAsked, theSourceAsked } from '@/lib/playback-source'
import { RefreshOnSignal } from '@/components/vela/app-signals'
import { RecordingDetailView } from '@/components/recordings/recording-detail-page'
import { throwRecordingAway } from '@/app/(app)/library/actions'
import { callOffJob } from '@/app/(app)/settings/encode/actions'
import {
  askForTheSound,
  askWhichArtefact,
  keepThePosition,
  noteTheSeek,
  noteTheSkip,
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

  const jar = await cookies()
  const decodes = decodesOf(jar.get(DECODES_COOKIE)?.value)
  const autoOpensDataBroadcast = flagOf(
    jar.get(DATA_BROADCAST_AUTO_OPEN)?.value,
    AUTO_OPEN_SPELLING,
  )

  const [
    detail,
    playback,
    unaskedProfile,
    profiles,
    encodeChoices,
    encodeJob,
    artefact,
    modelVersion,
  ] = await Promise.all([
    getRecording(id),
    decodesCarinaTakes(decodes).then((told) =>
      getPlaybackPlan(id, undefined, theSourceAsked(source), told),
    ),
    getUnaskedPlaybackProfile(),
    getPlaybackProfiles(),
    listEncodeChoices(),
    getLatestEncodeJob(id),
    getStandingArtefact(id).catch((error: unknown) => {
      console.warn('[recording] the standing artefact was not read', id, error)

      return undefined
    }),
    getSegmentModelVersion(id),
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
        profiles={profiles}
        formatChoice={formatChoiceOf(jar.get(FORMAT_COOKIE)?.value)}
        startAt={secondsIn(at)}
        startsHeld={theHoldAsked(paused)}
        autoOpensDataBroadcast={autoOpensDataBroadcast}
        captionStyle={captionStyleOf(jar.get(CAPTION_STYLE_COOKIE)?.value)}
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
        modelVersion={
          modelVersion.state === 'ok' ? modelVersion.value : undefined
        }
        onNoteSkip={noteTheSkip}
        onNoteSeek={noteTheSeek}
      />
    </>
  )
}
