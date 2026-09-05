import { formatBroadcastStart, formatDateTime } from '@/lib/format'
import {
  callsOff,
  headwayPercent,
  jobStatusIn,
  pageIn,
  secondsBetween,
} from '@/lib/encode'
import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'
import type {
  Deinterlace,
  EncodeCodec,
  EncodeDestinationDraft,
  EncodeEncoder,
  EncodeFailure,
  EncodeJobStatus,
  EncodeProfileDraft,
  EncodeResolution,
  EncodeSwerve,
} from '@/repository/encode-terms'
import { toInt } from '@/repository/programmes'
import {
  clockWithSeconds,
  listRecordingNames,
  type RecordingName,
} from '@/repository/recordings'

type ProfileResponder = components['schemas']['EncodeProfileResponder']
type DestinationResponder = components['schemas']['EncodeDestinationResponder']
type JobResponder = components['schemas']['EncodeJobResponder']
type JobPageResponder = components['schemas']['EncodeJobListResponder']

export interface EncodeProfile {
  id: string
  label: string
  codec: EncodeCodec
  resolution: EncodeResolution
  deinterlace: Deinterlace
  rateFactor: number
  quantiser: number
  definedAt: string
}

export interface EncodeDestination {
  id: string
  label: string
  outputRoot: string
  defaultProfileId: string
  /** Unset where the profile the destination names is no longer defined. */
  defaultProfileLabel?: string
  definedAt: string
}

export interface EncodeHeadway {
  percent?: number
  leftSeconds?: number
  at: string
}

export interface EncodeRoute {
  asked: EncodeEncoder
  ran: EncodeEncoder
  swerved?: EncodeSwerve
}

export interface EncodeFailureDetail {
  failure: EncodeFailure
  note: string
  noticedAt: string
}

export interface EncodeJob {
  id: string
  recordingId: string
  /** Unset where the recording has since been thrown away. */
  title?: string
  recordedAt?: string
  profileLabel?: string
  destinationLabel?: string
  outputRoot: string
  status: EncodeJobStatus
  attempt: number
  queuedAt: string
  startedAt?: string
  endedAt?: string
  elapsedSeconds?: number
  headway?: EncodeHeadway
  quietForSeconds?: number
  stalled: boolean
  route?: EncodeRoute
  failure?: EncodeFailureDetail
  artefactName?: string
  cancellable: boolean
}

export interface EncodeJobsPage {
  items: EncodeJob[]
  total: number
  page: number
  lastPage: number
  perPage: number
  status?: EncodeJobStatus
}

export interface EncodeScreen {
  profiles: EncodeProfile[]
  destinations: EncodeDestination[]
  roots: string[]
  jobs: EncodeJobsPage
  running: EncodeJob | null
  waiting: number
  failed: number
}

export interface EncodeQuery {
  status?: string | string[]
  page?: string | string[]
}

export type EncodeWrite =
  | { state: 'ok' }
  | { state: 'unauthenticated' }
  | { state: 'rejected'; message: string }

export interface EncodeChoice {
  id: string
  label: string
}

export interface EncodeDestinationChoice extends EncodeChoice {
  defaultProfileId: string
}

export interface EncodeChoices {
  profiles: EncodeChoice[]
  destinations: EncodeDestinationChoice[]
}

const JOBS_PER_PAGE = 20

const UNREADABLE = 'エンコードの台帳を読めませんでした'

export async function getEncodeScreen(
  query: EncodeQuery = {},
  now: Date = new Date(),
): Promise<EncodeScreen> {
  const status = jobStatusIn(query.status)
  const page = pageIn(query.page)
  const [profiles, destinations, roots, names, jobs, running, waiting, failed] =
    await Promise.all([
      fetchProfiles(),
      fetchDestinations(),
      fetchRoots(),
      listRecordingNames(),
      fetchJobs({ status, page, perPage: JOBS_PER_PAGE }),
      fetchJobs({ status: 'running', page: 1, perPage: 1 }),
      fetchJobs({ status: 'queued', page: 1, perPage: 1 }),
      fetchJobs({ status: 'failed', page: 1, perPage: 1 }),
    ])
  const named = {
    profiles: new Map(profiles.map((one) => [one.id, one.label])),
    destinations: new Map(destinations.map((one) => [one.id, one.label])),
    recordings: names,
  }
  const toJob = (one: JobResponder) => toEncodeJob(one, named, now)
  const recordingRoots = new Set(
    [...names.values()].map((one) => one.outputRoot),
  )

  return {
    profiles: profiles.map(toProfile),
    destinations: destinations.map((one) => toDestination(one, named.profiles)),
    roots: roots.filter((root) => !recordingRoots.has(root)),
    jobs: {
      items: jobs.items.map(toJob),
      total: toInt(jobs.total),
      page: toInt(jobs.currentPage),
      lastPage: toInt(jobs.lastPage),
      perPage: toInt(jobs.perPage),
      status,
    },
    running: running.items[0] ? toJob(running.items[0]) : null,
    waiting: toInt(waiting.total),
    failed: toInt(failed.total),
  }
}

export async function listEncodeChoices(): Promise<EncodeChoices> {
  const [profiles, destinations] = await Promise.all([
    fetchProfiles(),
    fetchDestinations(),
  ])

  return {
    profiles: profiles.map((one) => ({ id: one.id, label: one.label })),
    destinations: destinations.map((one) => ({
      id: one.id,
      label: one.label,
      defaultProfileId: one.defaultProfileId,
    })),
  }
}

export async function defineProfile(
  draft: EncodeProfileDraft,
): Promise<EncodeWrite> {
  const { data, response } = await carinaClient().POST(
    '/api/encoding/profiles',
    { body: draft },
  )

  return toWrite(response, data?.message, {
    400: 'この内容ではプロファイルを保存できませんでした。',
  })
}

export async function defineDestination(
  draft: EncodeDestinationDraft,
): Promise<EncodeWrite> {
  const { data, response } = await carinaClient().POST(
    '/api/encoding/destinations',
    { body: draft },
  )

  return toWrite(response, data?.message, {
    400: /outputRoot/.test(data?.message ?? '')
      ? 'この出力ルートには成果物を置けません。'
      : 'この内容では保存先を保存できませんでした。',
    502: '保存先の一覧を確認できないため、保存できませんでした。',
    503: '保存先の一覧を確認できないため、保存できませんでした。',
  })
}

const QUEUE_REFUSED: [RegExp, string][] = [
  [/no recording/i, 'この録画は残っていないため、エンコードできませんでした。'],
  [
    /no destination/i,
    'この保存先は残っていないため、エンコードできませんでした。',
  ],
  [
    /no profile/i,
    'このプロファイルは残っていないため、エンコードできませんでした。',
  ],
  [
    /still being written/i,
    'この録画はまだ書き込み中のため、エンコードできませんでした。',
  ],
  [
    /failed, so/i,
    'この録画は失敗しているため、エンコードするものがありません。',
  ],
  [/already has job/i, 'この録画のエンコードはすでに待機中か実行中です。'],
  [
    /already encoded/i,
    'この録画はこのプロファイルですでにエンコード済みです。',
  ],
]

export async function queueEncode(
  recordingId: string,
  destinationId: string,
  profileId?: string,
): Promise<EncodeWrite> {
  const { data, response } = await carinaClient().POST('/api/encoding/jobs', {
    body: { recordingId, destinationId, profileId: profileId ?? null },
  })

  if (response.status === 401) {
    return { state: 'unauthenticated' }
  }

  if (response.ok) {
    return { state: 'ok' }
  }

  const said = data?.message ?? ''
  const known = QUEUE_REFUSED.find(([reads]) => reads.test(said))

  return {
    state: 'rejected',
    message: known
      ? known[1]
      : `エンコードを登録できませんでした(${response.status})。`,
  }
}

export async function callOffEncode(id: string): Promise<EncodeWrite> {
  const { data, response } = await carinaClient().POST(
    '/api/encoding/jobs/{id}/cancel',
    { params: { path: { id } } },
  )

  return toWrite(response, data?.message, {
    404: 'このジョブは残っていないため、中止できませんでした。',
    409: 'このジョブはすでに終わっているため、中止できませんでした。',
  })
}

function toWrite(
  response: Response,
  said: string | undefined,
  refusals: Partial<Record<number, string>>,
): EncodeWrite {
  if (response.status === 401) {
    return { state: 'unauthenticated' }
  }

  if (response.ok) {
    return { state: 'ok' }
  }

  return {
    state: 'rejected',
    message:
      refusals[response.status] ??
      `${said || '保存できませんでした'}(${response.status})。`,
  }
}

async function fetchProfiles(): Promise<ProfileResponder[]> {
  const { data, error } = await carinaClient().GET('/api/encoding/profiles')

  if (error || !data?.data) {
    throw new Error(data?.message || UNREADABLE)
  }

  return data.data.items
}

async function fetchDestinations(): Promise<DestinationResponder[]> {
  const { data, error } = await carinaClient().GET('/api/encoding/destinations')

  if (error || !data?.data) {
    throw new Error(data?.message || UNREADABLE)
  }

  return data.data.items
}

async function fetchRoots(): Promise<string[]> {
  const { data, error } = await carinaClient().GET('/api/storage')

  if (error || !data?.data) {
    throw new Error(data?.message || UNREADABLE)
  }

  return data.data.roots.map((root) => root.name)
}

async function fetchJobs(query: {
  status?: EncodeJobStatus
  page: number
  perPage: number
}): Promise<JobPageResponder> {
  const { data, error } = await carinaClient().GET('/api/encoding/jobs', {
    params: {
      query: {
        ...(query.status ? { status: [query.status] } : {}),
        page: query.page,
        perPage: query.perPage,
      },
    },
  })

  if (error || !data?.data) {
    throw new Error(data?.message || UNREADABLE)
  }

  return data.data
}

function toProfile(one: ProfileResponder): EncodeProfile {
  return {
    id: one.id,
    label: one.label,
    codec: one.codec,
    resolution: one.resolution,
    deinterlace: one.deinterlace,
    rateFactor: toInt(one.rateFactor),
    quantiser: toInt(one.quantiser),
    definedAt: formatDateTime(one.definedAt),
  }
}

function toDestination(
  one: DestinationResponder,
  profiles: ReadonlyMap<string, string>,
): EncodeDestination {
  return {
    id: one.id,
    label: one.label,
    outputRoot: one.outputRoot,
    defaultProfileId: one.defaultProfileId,
    defaultProfileLabel: profiles.get(one.defaultProfileId),
    definedAt: formatDateTime(one.definedAt),
  }
}

interface Named {
  profiles: ReadonlyMap<string, string>
  destinations: ReadonlyMap<string, string>
  recordings: ReadonlyMap<string, RecordingName>
}

export function toEncodeJob(
  one: JobResponder,
  named: Named,
  now: Date,
): EncodeJob {
  const recording = named.recordings.get(one.recordingId)

  return {
    id: one.id,
    recordingId: one.recordingId,
    title: recording?.title,
    recordedAt: recording
      ? formatBroadcastStart(recording.startedAt)
      : undefined,
    profileLabel: named.profiles.get(one.profileId),
    destinationLabel: named.destinations.get(one.destinationId),
    outputRoot: one.outputRoot,
    status: one.status,
    attempt: toInt(one.attempt),
    queuedAt: formatDateTime(one.queuedAt),
    startedAt: one.startedAt ? formatDateTime(one.startedAt) : undefined,
    endedAt: one.endedAt ? formatDateTime(one.endedAt) : undefined,
    elapsedSeconds:
      one.status === 'running' && one.startedAt
        ? secondsBetween(one.startedAt, now)
        : undefined,
    headway: one.headway
      ? {
          percent: headwayPercent(one.headway.portion),
          leftSeconds:
            one.headway.leftSeconds === null
              ? undefined
              : toInt(one.headway.leftSeconds),
          at: clockWithSeconds(new Date(one.headway.at)),
        }
      : undefined,
    quietForSeconds:
      one.quietForSeconds === null ? undefined : toInt(one.quietForSeconds),
    stalled: one.stalled,
    route: one.route
      ? {
          asked: one.route.asked,
          ran: one.route.ran,
          swerved: one.route.swerved ?? undefined,
        }
      : undefined,
    failure: one.failure
      ? {
          failure: one.failure.failure,
          note: one.failure.note,
          noticedAt: formatDateTime(one.failure.noticedAt),
        }
      : undefined,
    artefactName: one.artefactName ?? undefined,
    cancellable: callsOff(one.status),
  }
}
