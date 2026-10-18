import { unstable_rethrow } from 'next/navigation'

import { formatMoment } from '@/lib/format'
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

export type SegmentVersionState =
  components['schemas']['SegmentModelVersionState']

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
  confirmedRecordings: number
  boundaries: number
  enough: boolean
  recordingsNeeded: number
  boundariesNeeded: number
}

export interface SegmentMetrics {
  boundaryRecallWithin2s?: number
  boundaryRecallWithin1s?: number
  extraBoundariesPerRecording: number
  programmeSkippedSecondsPerHour: number
  returnedAfterSkipping?: number
}

export interface SegmentMetricsSummary {
  boundaryRecallWithin2s?: number
  programmeSkippedSecondsPerHour: number
}

export interface SegmentStation {
  key: string
  name: string
  no?: string
  logo?: StationLogo
  confirmedRecordings: number
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
  recommended?: number
}

export interface SegmentStatus {
  learning: boolean
  learningData: LearningData
  catalog: SegmentCatalog
  version: SegmentVersionInUse
  evidence: SegmentEvidence
  metrics?: SegmentMetrics
  stations: SegmentStation[]
  versions: SegmentVersion[]
  skipThreshold: SkipThreshold
}

function numberOr(value: null | number | string): number | undefined {
  return value === null ? undefined : Number(value)
}

function summaryOf(
  metrics: SegmentMetricsSummaryResponder,
): SegmentMetricsSummary {
  return {
    boundaryRecallWithin2s: numberOr(metrics.boundaryRecallWithin2s),
    programmeSkippedSecondsPerHour: Number(
      metrics.programmeSkippedSecondsPerHour,
    ),
  }
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
    confirmedRecordings: Number(station.confirmedRecordings),
    metrics: summaryOf(station.metrics),
  }
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
): SegmentStatus {
  const { learningData, catalog, version, evidence, metrics, skipThreshold } =
    status

  return {
    learning: status.learning,
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
    evidence: {
      confirmedRecordings: Number(evidence.confirmedRecordings),
      boundaries: Number(evidence.boundaries),
      enough: evidence.enough,
      recordingsNeeded: Number(evidence.recordingsNeeded),
      boundariesNeeded: Number(evidence.boundariesNeeded),
    },
    metrics: metrics
      ? {
          boundaryRecallWithin2s: numberOr(metrics.boundaryRecallWithin2s),
          boundaryRecallWithin1s: numberOr(metrics.boundaryRecallWithin1s),
          extraBoundariesPerRecording: Number(
            metrics.extraBoundariesPerRecording,
          ),
          programmeSkippedSecondsPerHour: Number(
            metrics.programmeSkippedSecondsPerHour,
          ),
          returnedAfterSkipping: numberOr(metrics.returnedAfterSkipShare),
        }
      : undefined,
    stations: status.stations.map((one) => stationOf(one, known)),
    versions: status.versions.map(versionOf),
    skipThreshold: {
      current: Number(skipThreshold.current),
      recommended: numberOr(skipThreshold.recommended),
    },
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

    return { state: 'ok', value: statusOf(status, known) }
  } catch (error) {
    unstable_rethrow(error)

    return { state: 'unavailable' }
  }
}
