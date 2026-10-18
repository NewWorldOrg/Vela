import {
  LEARNING_OFF,
  NOT_APPLICABLE,
  boundaryMatchOf,
  evidenceShortOf,
  extraBoundariesOf,
  programmeSkippedOf,
  returnedAfterSkipOf,
  versionLabel,
} from '@/lib/segment-detection'
import type {
  SegmentMetrics,
  SegmentStation,
  SegmentStatus,
} from '@/repository/segment-status'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChannelMark } from '@/components/vela/channel-mark'
import { Surface } from '@/components/vela/surface'
import { ValueRow, ValueRows } from '@/components/segments/value-rows'

export const PRECISION_SLOT = 'segment-precision'

const STATION_COLUMNS = ['局', '確かめた録画', '境目の一致', '本編を飛ばす誤り']

const NUMBERS = 'font-code tabular-nums text-ink-2'

function learningSays(status: SegmentStatus): string | undefined {
  return status.learning ? evidenceShortOf(status.evidence) : LEARNING_OFF
}

function said<T>(
  metrics: SegmentMetrics | undefined,
  say: (metrics: SegmentMetrics) => T,
): T | string {
  return metrics ? say(metrics) : NOT_APPLICABLE
}

export function PrecisionPanel({ status }: { status: SegmentStatus }) {
  const { version, evidence, metrics } = status
  const learning = learningSays(status)

  return (
    <>
      <Surface data-slot={PRECISION_SLOT}>
        <ValueRows>
          <ValueRow name="モデルのバージョン">
            <span className="inline-flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              {versionLabel(version.number)}
              <Badge variant={version.byHand ? 'mute' : 'secondary'}>
                {version.byHand ? '手動で選択' : '自動'}
              </Badge>
            </span>
          </ValueRow>
          <ValueRow name="採用">{version.adoptedAt ?? NOT_APPLICABLE}</ValueRow>
          {learning && <ValueRow name="学習">{learning}</ValueRow>}
          <ValueRow name="確かめた録画">
            {evidence.confirmedRecordings} 件
          </ValueRow>
          <ValueRow name="境目の一致">
            {said(metrics, (one) =>
              boundaryMatchOf(
                one.boundaryRecallWithin2s,
                one.boundaryRecallWithin1s,
              ),
            )}
          </ValueRow>
          <ValueRow name="余計な境目">
            {said(metrics, (one) =>
              extraBoundariesOf(one.extraBoundariesPerRecording),
            )}
          </ValueRow>
          <ValueRow name="本編を飛ばす誤り">
            {said(metrics, (one) =>
              programmeSkippedOf(one.programmeSkippedSecondsPerHour),
            )}
          </ValueRow>
          <ValueRow name="飛ばした直後に戻った割合">
            {returnedAfterSkipOf(metrics?.returnedAfterSkipping)}
          </ValueRow>
        </ValueRows>
      </Surface>
      {status.stations.length > 0 && (
        <StationTable stations={status.stations} />
      )}
    </>
  )
}

function StationTable({ stations }: { stations: SegmentStation[] }) {
  return (
    <Table containerClassName="mt-3" className="min-w-[calc(560rem/16)]">
      <TableHeader>
        <TableRow>
          {STATION_COLUMNS.map((column) => (
            <TableHead key={column}>{column}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {stations.map((station) => (
          <TableRow key={station.key}>
            <TableCell>
              <span className="flex items-center gap-2">
                <ChannelMark logo={station.logo} no={station.no} keepsTheSlot />
                <span className="min-w-0">{station.name}</span>
              </span>
            </TableCell>
            <TableCell className={NUMBERS}>
              {station.confirmedRecordings} 件
            </TableCell>
            <TableCell className={NUMBERS}>
              {boundaryMatchOf(station.metrics.boundaryRecallWithin2s)}
            </TableCell>
            <TableCell className={NUMBERS}>
              {programmeSkippedOf(
                station.metrics.programmeSkippedSecondsPerHour,
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
