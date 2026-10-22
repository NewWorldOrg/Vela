import { unstable_rethrow } from 'next/navigation'

import {
  formatMoment,
  formatSpokenHour,
  formatSpokenMoment,
} from '@/lib/format'
import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'
import type { StationLogo } from '@/repository/channels'
import type { GuideChannel } from '@/repository/programs'
import { fetchServiceChannels } from '@/repository/programs'
import type { Reading } from '@/repository/system'

type SegmentStatusResponder = components['schemas']['SegmentStatusResponder']
type SegmentMetricsSummaryResponder =
  components['schemas']['SegmentMetricsSummaryResponder']
type SegmentStationResponder = components['schemas']['SegmentStationResponder']
type SegmentVersionHistoryResponder =
  components['schemas']['SegmentVersionHistoryResponder']
type SegmentKindMetricsResponder =
  components['schemas']['SegmentKindMetricsResponder']
type SegmentEvidenceResponder =
  components['schemas']['SegmentEvidenceResponder']
type SegmentLearningRoundResponder =
  components['schemas']['SegmentLearningRoundResponder']
type SegmentRoundMetricsResponder =
  components['schemas']['SegmentRoundMetricsResponder']

export type SegmentVersionState =
  components['schemas']['SegmentModelVersionState']

export type SegmentRoundOutcome =
  components['schemas']['SegmentTrainingOutcome']

export type SegmentRoundVerdict = NonNullable<
  components['schemas']['AdoptionVerdict']
>

export interface LearningData {
  recordings: number
  seconds: number
  bytes: number
  waiting: number
}

export interface SegmentCatalog {
  cm: number
  programmeFixture: number
}

export interface SegmentVersionInUse {
  number: number
  byHand: boolean
  adoptedAt?: string
}

export interface SegmentEvidence {
  recordings: number
  boundaries: number
  enough: boolean
  recordingsNeeded: number
  boundariesNeeded: number
}

export type RecalledKind = 'break' | 'opening' | 'ending'

export interface SegmentKindRecall {
  kind: RecalledKind
  recall?: number
}

export interface SegmentMetrics {
  boundaryRecallWithin2s?: number
  boundaryRecallWithin1s?: number
  kinds: SegmentKindRecall[]
  returnedAfterSkipping?: number
}

export interface SegmentMetricsSummary {
  boundaryRecallWithin2s?: number
}

export interface SegmentStation {
  key: string
  name: string
  no?: string
  logo?: StationLogo
  recordings: number
  metrics: SegmentMetricsSummary
}

export interface SegmentVersion {
  number: number
  state: SegmentVersionState
  trainedAt: string
  rolledBackAt?: string
  metrics?: SegmentMetricsSummary
}

export interface SkipThreshold {
  current: number
}

export interface SegmentRoundFigures {
  boundaryRecallWithin2s?: number
  breakRecall?: number
}

export interface SegmentRound {
  takenAt: string
  outcome: SegmentRoundOutcome
  candidate?: number
  verdict?: SegmentRoundVerdict
  inUse?: SegmentRoundFigures
  evidence?: SegmentEvidence
  metrics?: SegmentRoundFigures
}

export interface SegmentStatus {
  learningData: LearningData
  catalog: SegmentCatalog
  version: SegmentVersionInUse
  evidence: SegmentEvidence
  metrics?: SegmentMetrics
  stations: SegmentStation[]
  versions: SegmentVersion[]
  skipThreshold: SkipThreshold
  lastRound?: SegmentRound
  nextRound?: string
}

function numberOr(value: null | number | string): number | undefined {
  return value === null ? undefined : Number(value)
}

const RECALLED_KINDS: RecalledKind[] = ['break', 'opening', 'ending']

function summaryOf(
  metrics: SegmentMetricsSummaryResponder,
): SegmentMetricsSummary {
  return { boundaryRecallWithin2s: numberOr(metrics.boundaryRecallWithin2s) }
}

function kindsOf(kinds: SegmentKindMetricsResponder[]): SegmentKindRecall[] {
  return RECALLED_KINDS.flatMap((kind) => {
    const said = kinds.find((one) => one.kind === kind)

    return said ? [{ kind, recall: numberOr(said.recall) }] : []
  })
}

function stationOf(
  station: SegmentStationResponder,
  known: GuideChannel[],
): SegmentStation {
  const key = `${Number(station.networkId)}-${Number(station.serviceId)}`
  const channel = known.find((one) => one.id === key)

  return {
    key,
    name: channel?.name || key,
    no: channel?.no,
    logo: channel?.logo,
    recordings: Number(station.recordings),
    metrics: summaryOf(station.metrics),
  }
}

function evidenceOf(evidence: SegmentEvidenceResponder): SegmentEvidence {
  return {
    recordings: Number(evidence.recordings),
    boundaries: Number(evidence.boundaries),
    enough: evidence.enough,
    recordingsNeeded: Number(evidence.recordingsNeeded),
    boundariesNeeded: Number(evidence.boundariesNeeded),
  }
}

function figuresOf(
  figures: SegmentRoundMetricsResponder | null,
): SegmentRoundFigures | undefined {
  return figures
    ? {
        boundaryRecallWithin2s: numberOr(figures.boundaryRecallWithin2s),
        breakRecall: numberOr(figures.breakRecall),
      }
    : undefined
}

function roundOf(round: SegmentLearningRoundResponder): SegmentRound {
  return {
    takenAt: formatSpokenMoment(round.takenAt),
    outcome: round.outcome,
    candidate: numberOr(round.candidate),
    verdict: round.verdict ?? undefined,
    inUse: figuresOf(round.inUse),
    evidence: round.evidence ? evidenceOf(round.evidence) : undefined,
    metrics: figuresOf(round.metrics),
  }
}

function upcomingOf(notBefore: string, now: number): string | undefined {
  return Date.parse(notBefore) > now ? formatSpokenHour(notBefore) : undefined
}

function versionOf(version: SegmentVersionHistoryResponder): SegmentVersion {
  return {
    number: Number(version.number),
    state: version.state,
    trainedAt: formatMoment(version.trainedAt),
    rolledBackAt: version.rolledBack
      ? formatMoment(version.rolledBack.at)
      : undefined,
    metrics: version.metrics ? summaryOf(version.metrics) : undefined,
  }
}

function statusOf(
  status: SegmentStatusResponder,
  known: GuideChannel[],
  now: number,
): SegmentStatus {
  const { learningData, catalog, version, evidence, metrics, skipThreshold } =
    status

  return {
    learningData: {
      recordings: Number(learningData.recordings),
      seconds: Number(learningData.seconds),
      bytes: Number(learningData.bytes),
      waiting: Number(learningData.waiting),
    },
    catalog: {
      cm: Number(catalog.cm),
      programmeFixture: Number(catalog.programmeFixture),
    },
    version: {
      number: Number(version.number),
      byHand: version.byHand,
      adoptedAt: version.adoptedAt
        ? formatMoment(version.adoptedAt)
        : undefined,
    },
    evidence: evidenceOf(evidence),
    metrics: metrics
      ? {
          boundaryRecallWithin2s: numberOr(metrics.boundaryRecallWithin2s),
          boundaryRecallWithin1s: numberOr(metrics.boundaryRecallWithin1s),
          kinds: kindsOf(metrics.kinds),
          returnedAfterSkipping: numberOr(metrics.returnedAfterSkipShare),
        }
      : undefined,
    stations: status.stations.map((one) => stationOf(one, known)),
    versions: status.versions.map(versionOf),
    skipThreshold: { current: Number(skipThreshold.current) },
    lastRound: status.lastRound ? roundOf(status.lastRound) : undefined,
    nextRound: upcomingOf(status.nextRoundNotBefore, now),
  }
}

async function knownStations(): Promise<GuideChannel[]> {
  try {
    return await fetchServiceChannels()
  } catch (error) {
    unstable_rethrow(error)

    return []
  }
}

export async function getSegmentStatus(): Promise<Reading<SegmentStatus>> {
  try {
    const [{ data, response }, known] = await Promise.all([
      carinaClient().GET('/api/segments/status'),
      knownStations(),
    ])

    if (response.status === 401) {
      return { state: 'unauthenticated' }
    }

    const status = data?.data

    if (!status) {
      return { state: 'unavailable' }
    }

    return { state: 'ok', value: statusOf(status, known, Date.now()) }
  } catch (error) {
    unstable_rethrow(error)

    return { state: 'unavailable' }
  }
}
