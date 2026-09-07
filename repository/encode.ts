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
import {
  LABEL_LONGEST,
  RATE_CONTROL_COARSEST,
  RATE_CONTROL_FINEST,
} from '@/repository/encode-terms'
import { toInt } from '@/repository/programmes'
import {
  clockWithSeconds,
  listRecordingNames,
  type RecordingName,
} from '@/repository/recordings'
import { whatItSaid } from '@/repository/said'

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

export interface EncodeAsking {
  did: string
  fell: string
  throughDriver?: boolean
}

export const WHEN_QUEUEING: EncodeAsking = {
  did: 'エンコード',
  fell: 'エンコードを登録できませんでした',
}

export const WHEN_CALLING_OFF: EncodeAsking = {
  did: '中止',
  fell: 'このジョブを中止できませんでした',
}

export const WHEN_SAVING_A_PROFILE: EncodeAsking = {
  did: '保存',
  fell: 'プロファイルを保存できませんでした',
}

export const WHEN_CHANGING_A_PROFILE: EncodeAsking = {
  did: '変更',
  fell: 'プロファイルを変更できませんでした',
}

export const WHEN_REMOVING_A_PROFILE: EncodeAsking = {
  did: '撤去',
  fell: 'プロファイルを撤去できませんでした',
}

export const WHEN_SAVING_A_DESTINATION: EncodeAsking = {
  did: '保存',
  fell: '保存先を保存できませんでした',
  throughDriver: true,
}

export const WHEN_CHANGING_A_DESTINATION: EncodeAsking = {
  did: '変更',
  fell: '保存先を変更できませんでした',
  throughDriver: true,
}

export const WHEN_REMOVING_A_DESTINATION: EncodeAsking = {
  did: '撤去',
  fell: '保存先を撤去できませんでした',
}

const DRIVER_OUT_OF_REACH = 'driver に接続できないため、'

const REFUSAL_SAYINGS: [RegExp, string][] = [
  [
    /failed, so there is nothing to encode/i,
    'この録画は失敗しているため、エンコードするものがありません。',
  ],
  [/already has job/i, 'この録画のエンコードはすでに待機中か実行中です。'],
  [
    /already encoded with profile/i,
    'この録画はこのプロファイルですでにエンコード済みです。',
  ],
]

const REFUSED_FIELDS: [RegExp, string][] = [
  [/\blabel: a name a person reads/i, '名称が入力されていない'],
  [/\blabel: at most/i, `名称が ${LABEL_LONGEST} 文字を超えている`],
  [/\bcodec:/i, 'コーデックの指定が正しくない'],
  [/\bresolution:/i, '解像度の指定が正しくない'],
  [/\bdeinterlace:/i, 'インタレース解除の指定が正しくない'],
  [
    /\brateFactor:/i,
    `品質(CRF)が ${RATE_CONTROL_FINEST} 〜 ${RATE_CONTROL_COARSEST} の範囲にない`,
  ],
  [
    /\bquantiser:/i,
    `品質(QP)が ${RATE_CONTROL_FINEST} 〜 ${RATE_CONTROL_COARSEST} の範囲にない`,
  ],
  [/\boutputRoot: the name of a root/i, 'この出力ルートは残っていない'],
  [
    /\boutputRoot: a root this process holds/i,
    'この出力ルートには成果物を置けない',
  ],
  [/\bdefaultProfileId:/i, '既定のプロファイルが選ばれていない'],
]

const REFUSAL_REASONS: [RegExp, string][] = [
  [/holds no recording/i, 'この録画は残っていないため、'],
  [/still being written/i, 'この録画はまだ書き込み中のため、'],
  [/no destination \S+ is defined/i, 'この保存先は残っていないため、'],
  [/no profile \S+ is defined/i, 'このプロファイルは残っていないため、'],
  [/holds no job/i, 'このジョブは残っていないため、'],
  [/^destination \S+ was retired/i, 'この保存先は退役しているため、'],
  [/^profile \S+ was retired/i, 'このプロファイルは退役しているため、'],
  [
    /^destination \S+ is what job/i,
    'この保存先を使うジョブが実行中か待機中のため、',
  ],
  [
    /^profile \S+ is what job/i,
    'このプロファイルを使うジョブが実行中か待機中のため、',
  ],
  [
    /is what destination \S+ encodes with/i,
    'このプロファイルを既定にしている保存先があるため、',
  ],
  [/is the only one left/i, 'この保存先は最後の 1 つのため、'],
  [/already ended as/i, 'このジョブはすでに終わっているため、'],
  [/moved in the ledger/i, 'このジョブは中止の途中で状態が変わったため、'],
  [/the driver does not answer/i, DRIVER_OUT_OF_REACH],
  [/a profile is defined by/i, 'プロファイルの内容が揃っていないため、'],
  [/a destination is defined by/i, '保存先の内容が揃っていないため、'],
  [
    /is named by a UUID|is named by the thirty-two hexadecimal digits/i,
    '対象を正しく指定できていないため、',
  ],
]

export function whyItRefused(
  asking: EncodeAsking,
  status: number,
  said: string | undefined,
): string {
  const heard = said ?? ''
  const saying = REFUSAL_SAYINGS.find(([reads]) => reads.test(heard))

  if (saying) {
    return saying[1]
  }

  const fields = REFUSED_FIELDS.filter(([reads]) => reads.test(heard))

  if (fields.length > 0) {
    const why = fields.map(([, reason]) => reason).join('、')

    return `${why}ため、${asking.did}できませんでした。`
  }

  const reason = REFUSAL_REASONS.find(([reads]) => reads.test(heard))

  if (reason) {
    return `${reason[1]}${asking.did}できませんでした。`
  }

  if (asking.throughDriver && (status === 502 || status === 503)) {
    return `${DRIVER_OUT_OF_REACH}${asking.did}できませんでした。`
  }

  return `${asking.fell}(${status})。`
}

export async function defineProfile(
  draft: EncodeProfileDraft,
): Promise<EncodeWrite> {
  const { error, response } = await carinaClient().POST(
    '/api/encoding/profiles',
    { body: draft },
  )

  return toWrite(response, whatItSaid(error), WHEN_SAVING_A_PROFILE)
}

export async function defineDestination(
  draft: EncodeDestinationDraft,
): Promise<EncodeWrite> {
  const { error, response } = await carinaClient().POST(
    '/api/encoding/destinations',
    { body: draft },
  )

  return toWrite(response, whatItSaid(error), WHEN_SAVING_A_DESTINATION)
}

export async function queueEncode(
  recordingId: string,
  destinationId: string,
  profileId?: string,
): Promise<EncodeWrite> {
  const { error, response } = await carinaClient().POST('/api/encoding/jobs', {
    body: { recordingId, destinationId, profileId: profileId ?? null },
  })

  return toWrite(response, whatItSaid(error), WHEN_QUEUEING)
}

export async function callOffEncode(id: string): Promise<EncodeWrite> {
  const { error, response } = await carinaClient().POST(
    '/api/encoding/jobs/{id}/cancel',
    { params: { path: { id } } },
  )

  return toWrite(response, whatItSaid(error), WHEN_CALLING_OFF)
}

function toWrite(
  response: Response,
  said: string | undefined,
  asking: EncodeAsking,
): EncodeWrite {
  if (response.status === 401) {
    return { state: 'unauthenticated' }
  }

  if (response.ok) {
    return { state: 'ok' }
  }

  return {
    state: 'rejected',
    message: whyItRefused(asking, response.status, said),
  }
}

async function fetchProfiles(): Promise<ProfileResponder[]> {
  const { data, error } = await carinaClient().GET('/api/encoding/profiles')

  if (error || !data?.data) {
    throw new Error(whatItSaid(error, data) || UNREADABLE)
  }

  return data.data.items
}

async function fetchDestinations(): Promise<DestinationResponder[]> {
  const { data, error } = await carinaClient().GET('/api/encoding/destinations')

  if (error || !data?.data) {
    throw new Error(whatItSaid(error, data) || UNREADABLE)
  }

  return data.data.items
}

async function fetchRoots(): Promise<string[]> {
  const { data, error } = await carinaClient().GET('/api/storage')

  if (error || !data?.data) {
    throw new Error(whatItSaid(error, data) || UNREADABLE)
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
    throw new Error(whatItSaid(error, data) || UNREADABLE)
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
