import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'
import type { ChannelKind } from '@/repository/channels'
import { CHANNEL_KINDS } from '@/repository/channels'
import { toInt } from '@/repository/programmes'
import {
  calendarDateOf,
  clockLabel,
  dayLabel,
  kindOfNetwork,
} from '@/repository/programs'
import { whatItSaid } from '@/repository/said'

type CollectionStatusResponder =
  components['schemas']['CollectionStatusResponder']
type ServiceResponder = components['schemas']['BroadcastServiceResponder']
type StreamResponder = components['schemas']['StreamCollectionStatusResponder']
type TargetResponder = components['schemas']['ScanTargetResponder']
type TuneSystem = components['schemas']['TuneSystem']

export type StreamOutcome = components['schemas']['StreamCollectionOutcome']

const UNREACHED = Number.MAX_SAFE_INTEGER

export interface StreamVisitRow {
  key: string
  networkId: number
  transportStreamId?: number
  kind: ChannelKind
  name?: string
  channelNames: string[]
  channelLabel?: string
  serviceCount: number
  outcome: StreamOutcome
  lastCompletedLabel?: string
  lastAttemptedAt?: string
  lastAttemptedLabel?: string
  durationLabel?: string
  consecutiveIncomplete: number
  notBeforeLabel?: string
  neverCovered: number
  shortOfWanted: number
  coveredUntil?: string
}

export interface CollectTarget {
  value: string
  label: string
  networkId: number
  transportStreamId?: number
  serviceId?: number
}

export interface CollectionStatus {
  wantedCoverageHours: number
  streams: StreamVisitRow[]
  kindCounts: { kind: ChannelKind; label: string; count: number }[]
  troubledCount: number
  zeroServiceKinds: { kind: ChannelKind; label: string }[]
  streamTargets: CollectTarget[]
  serviceTargets: CollectTarget[]
}

export interface CoverageWarning {
  tone: 'warn' | 'danger'
  emphasis: string
  detail?: string
}

export type CollectScope = {
  networkId?: number
  transportStreamId?: number
  serviceId?: number
}

export type CollectNowResult =
  | { state: 'started'; streams: number }
  | { state: 'running' }
  | { state: 'cooldown'; notBefore?: string; notBeforeLabel?: string }
  | { state: 'missing' }
  | { state: 'unauthenticated' }
  | { state: 'rejected'; message: string }

export type RebuildResult =
  | { state: 'ok'; discarded: number }
  | { state: 'unauthenticated' }
  | { state: 'rejected'; message: string }

const KIND_LABEL: Record<ChannelKind, string> = {
  terrestrial: '地上波',
  bs: 'BS',
  cs110: 'CS110',
}

const KIND_ORDER: ChannelKind[] = ['terrestrial', 'bs', 'cs110']

const DAY_MS = 24 * 60 * 60 * 1000

const REBUILD_CONFIRMATION = 'discard-everything'

export async function getCollectionStatus(): Promise<CollectionStatus> {
  const client = carinaClient()
  const [status, services] = await Promise.all([
    client.GET('/api/epg/collection-status'),
    client.GET('/api/services'),
  ])

  if (status.error || !status.data?.data) {
    throw new Error(
      whatItSaid(status.error, status.data) || '収集状態を読めませんでした',
    )
  }

  if (services.error || !services.data?.data) {
    throw new Error(
      whatItSaid(services.error, services.data) ||
        'チャンネルを読めませんでした',
    )
  }

  return toCollectionStatus(status.data.data, services.data.data)
}

export function coverageWarningOf(
  status: CollectionStatus,
  kind: ChannelKind,
): CoverageWarning | undefined {
  const rows = status.streams.filter((row) => row.kind === kind)
  const never = rows.reduce((sum, row) => sum + row.neverCovered, 0)
  const short = rows.reduce((sum, row) => sum + row.shortOfWanted, 0)

  if (short === 0) {
    return undefined
  }

  const reach = reachLabel(status.wantedCoverageHours)

  if (never === 0) {
    return {
      tone: 'warn',
      emphasis: `${short} チャンネルの番組情報が ${reach}まで届いていません。`,
    }
  }

  return {
    tone: 'danger',
    emphasis: `${never} チャンネルの番組情報がまだ一度も取れていません。`,
    detail:
      short > never
        ? `ほかに ${short - never} チャンネルが ${reach}まで届いていません。`
        : undefined,
  }
}

export function coverageDaysOf(
  status: CollectionStatus,
  kind: ChannelKind,
  now: Date = new Date(),
): number {
  const reaches = status.streams
    .filter((row) => row.kind === kind)
    .flatMap((row) =>
      row.coveredUntil === undefined ? [] : [Date.parse(row.coveredUntil)],
    )
    .filter((at) => Number.isFinite(at))

  if (reaches.length === 0) {
    return 0
  }

  return Math.max(
    0,
    Math.floor((Math.max(...reaches) - now.getTime()) / DAY_MS),
  )
}

function reachLabel(hours: number): string {
  return hours % 24 === 0 ? `${hours / 24} 日先` : `${hours} 時間先`
}

export async function collectNow(
  scope: CollectScope,
): Promise<CollectNowResult> {
  const { data, error, response } = await carinaClient().POST(
    '/api/epg/collect-now',
    {
      body: {
        networkId: scope.networkId ?? null,
        transportStreamId: scope.transportStreamId ?? null,
        serviceId: scope.serviceId ?? null,
      },
    },
  )

  if (response.status === 401) {
    return { state: 'unauthenticated' }
  }

  if (response.status === 404) {
    return { state: 'missing' }
  }

  if (response.status === 409) {
    const refused =
      error?.data && 'refusal' in error.data ? error.data : undefined

    if (refused?.refusal === 'tooSoonAfterTheLastOne') {
      const notBefore = refused.notBefore ?? undefined

      return {
        state: 'cooldown',
        notBefore,
        notBeforeLabel: notBefore
          ? timeLabel(new Date(notBefore), new Date())
          : undefined,
      }
    }

    return { state: 'running' }
  }

  const streams = data?.data?.streams

  if (streams === undefined) {
    return {
      state: 'rejected',
      message: `いますぐ集めるを受け付けられませんでした(${response.status})。`,
    }
  }

  return { state: 'started', streams: toInt(streams) }
}

export async function rebuildEpg(): Promise<RebuildResult> {
  const { data, response } = await carinaClient().POST('/api/epg/rebuild', {
    body: { confirm: REBUILD_CONFIRMATION },
  })

  if (response.status === 401) {
    return { state: 'unauthenticated' }
  }

  const discarded = data?.data?.discarded

  if (discarded === undefined) {
    return {
      state: 'rejected',
      message: `破棄を受け付けられませんでした(${response.status})。`,
    }
  }

  return { state: 'ok', discarded: toInt(discarded) }
}

interface ServiceOnAir {
  networkId: number
  serviceId: number
  name: string
  television: boolean
  kind: ChannelKind
  channelLabel?: string
}

function toCollectionStatus(
  status: CollectionStatusResponder,
  services: ServiceResponder[],
): CollectionStatus {
  const streams = status.streams
  const now = new Date()
  const onAir = services.map(toServiceOnAir)

  const rows = streams
    .map((stream) => toRow(stream, onAir, now))
    .sort(
      (a, b) =>
        KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
        a.networkId - b.networkId ||
        (a.transportStreamId ?? UNREACHED) - (b.transportStreamId ?? UNREACHED),
    )

  const kindCounts = KIND_ORDER.flatMap((kind) => {
    const count = rows.filter((row) => row.kind === kind).length

    return count === 0 ? [] : [{ kind, label: KIND_LABEL[kind], count }]
  })

  const zeroServiceKinds = KIND_ORDER.flatMap((kind) =>
    onAir.some((service) => service.kind === kind && service.television)
      ? []
      : [
          {
            kind,
            label: CHANNEL_KINDS.find((k) => k.value === kind)?.label ?? kind,
          },
        ],
  )

  return {
    wantedCoverageHours: toInt(status.wantedCoverageHours),
    streams: rows,
    kindCounts,
    troubledCount: rows.filter((row) => row.outcome === 'incomplete').length,
    zeroServiceKinds,
    streamTargets: rows.flatMap((row) =>
      row.transportStreamId === undefined
        ? []
        : [
            {
              value: row.key,
              label: `TS ${row.transportStreamId}${row.channelLabel ? `(${row.channelLabel})` : ''}${row.name ?? ''}`,
              networkId: row.networkId,
              transportStreamId: row.transportStreamId,
            },
          ],
    ),
    serviceTargets: onAir
      .filter((service) => service.television)
      .map((service) => ({
        value: `${service.networkId}-${service.serviceId}`,
        label: service.name,
        networkId: service.networkId,
        serviceId: service.serviceId,
      })),
  }
}

function toRow(
  stream: StreamResponder,
  services: ServiceOnAir[],
  now: Date,
): StreamVisitRow {
  const networkId = toInt(stream.networkId)
  const transportStreamId =
    stream.transportStreamId === null
      ? undefined
      : toInt(stream.transportStreamId)
  const tunedLabel = channelLabelOf(stream.tuning)
  const serviceIds = stream.serviceIds.map(toInt)
  const carried = services
    .filter(
      (service) =>
        service.networkId === networkId &&
        serviceIds.includes(service.serviceId),
    )
    .sort((a, b) => a.serviceId - b.serviceId)
  const televised = carried.filter((service) => service.television)
  const drawn = new Set(televised.map((service) => service.serviceId))
  const coverage = stream.coverage.filter((entry) =>
    drawn.has(toInt(entry.serviceId)),
  )
  const reached = coverage
    .map((entry) => entry.coveredUntil)
    .filter((until) => until !== null)
    .sort((a, b) => Date.parse(a) - Date.parse(b))
    .at(-1)
  const lead = televised[0] ?? carried[0]
  const completedAt = stream.lastCompletedAt
    ? new Date(stream.lastCompletedAt)
    : undefined
  const attemptedAt = stream.lastAttemptedAt
    ? new Date(stream.lastAttemptedAt)
    : undefined
  const duration = toInt(stream.lastDurationMilliseconds)

  return {
    key: `${networkId}-${transportStreamId ?? `${stream.tuning.system}${toInt(stream.tuning.physicalChannel)}`}`,
    networkId,
    transportStreamId,
    kind: lead?.kind ?? kindOfNetwork(networkId),
    name: lead?.name || undefined,
    channelNames: televised.map((service) => service.name).filter(Boolean),
    channelLabel: lead?.channelLabel ?? tunedLabel,
    serviceCount: serviceIds.length,
    outcome: stream.outcome,
    lastCompletedLabel: completedAt ? timeLabel(completedAt, now) : undefined,
    lastAttemptedAt: stream.lastAttemptedAt ?? undefined,
    lastAttemptedLabel: attemptedAt ? timeLabel(attemptedAt, now) : undefined,
    durationLabel: duration > 0 ? spanLabel(duration) : undefined,
    consecutiveIncomplete: toInt(stream.consecutiveIncomplete),
    notBeforeLabel:
      stream.notBefore && new Date(stream.notBefore) > now
        ? timeLabel(new Date(stream.notBefore), now)
        : undefined,
    neverCovered: coverage.filter((entry) => entry.coveredUntil === null)
      .length,
    shortOfWanted: coverage.filter((entry) => !entry.meetsWantedCoverage)
      .length,
    coveredUntil: reached,
  }
}

function toServiceOnAir(service: ServiceResponder): ServiceOnAir {
  const networkId = toInt(service.networkId)
  const target = service.selectedChannel ?? service.candidates[0]?.target
  const system =
    !target || target.system === 'unspecified' ? undefined : target.system

  return {
    networkId,
    serviceId: toInt(service.serviceId),
    name: service.name ?? '',
    television: service.category === 'television',
    kind: (system && KIND_OF_SYSTEM[system]) ?? kindOfNetwork(networkId),
    channelLabel: target ? channelLabelOf(target) : undefined,
  }
}

const KIND_OF_SYSTEM: Partial<Record<TuneSystem, ChannelKind>> = {
  isdbT: 'terrestrial',
  isdbSBs: 'bs',
  isdbSCs110: 'cs110',
}

function channelLabelOf(target: {
  system: TuneSystem
  physicalChannel: TargetResponder['physicalChannel']
}): string | undefined {
  const channel = toInt(target.physicalChannel)

  if (target.system === 'isdbT') {
    return `${channel}ch`
  }

  if (target.system === 'isdbSBs') {
    return `BS${channel}`
  }

  if (target.system === 'isdbSCs110') {
    return `ND${channel}`
  }

  return undefined
}

function timeLabel(at: Date, now: Date): string {
  const clock = clockLabel(at)
  const date = calendarDateOf(at)

  return date === calendarDateOf(now) ? clock : `${dayLabel(date)} ${clock}`
}

function spanLabel(milliseconds: number): string {
  const total = Math.round(milliseconds / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60

  return minutes > 0
    ? `${minutes}分${String(seconds).padStart(2, '0')}秒`
    : `${seconds}秒`
}
