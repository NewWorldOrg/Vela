import {
  CHECKED_RECORDINGS,
  NOT_APPLICABLE,
  boundaryMatchOf,
  evidenceShortOf,
  recallRowsOf,
  recordingsOf,
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
  cardPlace,
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

const STATION_COLUMNS = ['局', CHECKED_RECORDINGS, '境目の一致']

const NUMBERS = 'font-code tabular-nums text-ink-2'

function said<T>(
  metrics: SegmentMetrics | undefined,
  say: (metrics: SegmentMetrics) => T,
): T | string {
  return metrics ? say(metrics) : NOT_APPLICABLE
}

export function PrecisionPanel({ status }: { status: SegmentStatus }) {
  const { version, evidence, metrics } = status
  const short = evidenceShortOf(evidence)

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
          {short && <ValueRow name="学習">{short}</ValueRow>}
          <ValueRow name={CHECKED_RECORDINGS}>
            {recordingsOf(evidence.recordings)}
          </ValueRow>
          <ValueRow name="境目の一致">
            {said(metrics, (one) =>
              boundaryMatchOf(
                one.boundaryRecallWithin2s,
                one.boundaryRecallWithin1s,
              ),
            )}
          </ValueRow>
          {recallRowsOf(metrics?.kinds).map((row) => (
            <ValueRow key={row.name} name={row.name}>
              {row.value}
            </ValueRow>
          ))}
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
    <Table cards containerClassName="mt-3" className="min-w-[calc(560rem/16)]">
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
            <TableCell {...cardPlace('lead')}>
              <span className="flex items-center gap-2">
                <ChannelMark logo={station.logo} no={station.no} keepsTheSlot />
                <span className="min-w-0">{station.name}</span>
              </span>
            </TableCell>
            <TableCell
              {...cardPlace('field', STATION_COLUMNS[1])}
              className={NUMBERS}
            >
              {recordingsOf(station.recordings)}
            </TableCell>
            <TableCell
              {...cardPlace('field', STATION_COLUMNS[2])}
              className={NUMBERS}
            >
              {boundaryMatchOf(station.metrics.boundaryRecallWithin2s)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
