import Link from 'next/link'
import type { Route } from 'next'

import { cn } from '@/lib/utils'
import { formatLength, formatSpan } from '@/lib/format'
import { EMPTY_VALUE } from '@/lib/empty-value'
import { wordFor } from '@/lib/not-yet-in-this-build'
import type { EncodeJob, EncodeWrite } from '@/repository/encode'
import {
  ENCODER_LABEL,
  FAILURE_LABEL,
  RECORDING_REMOVED_LABEL,
  STALLED_LABEL,
  SWERVE_LABEL,
} from '@/repository/encode-terms'
import {
  READABLE_LINE,
  Table,
  TableBody,
  TableColumns,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusCell } from '@/components/recordings/status-cell'
import { ADMIN_LIST_HEIGHT_CAP } from '@/components/vela/app-shell'
import { InFull } from '@/components/vela/in-full'
import { CancelJobButton } from '@/components/encode/cancel-job-button'
import {
  JOB_STATUS_COLUMN,
  JobStatusChip,
} from '@/components/encode/job-status-chip'

interface Column {
  label: string
  width: string
  hidden?: boolean
  right?: boolean
}

const STAMP_WIDTH = 'calc(122rem/16)'

const COLUMNS: Column[] = [
  { label: '番組', width: 'calc(320rem/16)' },
  { label: '状態', width: JOB_STATUS_COLUMN },
  { label: 'プロファイル', width: 'calc(104rem/16)' },
  { label: '保存先', width: 'calc(76rem/16)' },
  { label: '進捗', width: 'calc(60rem/16)', right: true },
  { label: '経路', width: 'calc(168rem/16)' },
  { label: '開始', width: STAMP_WIDTH },
  { label: '終了', width: STAMP_WIDTH },
  { label: '操作', width: 'calc(96rem/16)', hidden: true },
]

const TABLE_MIN = 'calc(1100rem/16)'

const STAMP = 'font-code text-sub tabular-nums whitespace-nowrap text-ink-2'

function Standing({ job }: { job: EncodeJob }) {
  const chip = <JobStatusChip status={job.status} stalled={job.stalled} say />
  const why = whyItStands(job)

  return why ? (
    <InFull says={why}>
      <span className="inline-flex">{chip}</span>
    </InFull>
  ) : (
    chip
  )
}

function whyItStands(job: EncodeJob): string {
  return [
    job.failure && wordFor(FAILURE_LABEL, job.failure.failure),
    job.failure?.note || undefined,
    job.attempt > 1 ? `${job.attempt} 回目` : undefined,
  ]
    .filter((one): one is string => Boolean(one))
    .join('\n')
}

function Dash() {
  return <span className="font-sans text-ink-3">{EMPTY_VALUE}</span>
}

function Started({ job }: { job: EncodeJob }) {
  return (
    <InFull says={`登録 ${job.queuedAt}`}>
      <span className="inline-block">{job.startedAt ?? <Dash />}</span>
    </InFull>
  )
}

function Destination({ job }: { job: EncodeJob }) {
  const said = job.destinationLabel ?? <Dash />

  return (
    <InFull says={job.outputRoot}>
      <span className="inline-block">{said}</span>
    </InFull>
  )
}

export function JobTable({
  jobs,
  onCallOff,
}: {
  jobs: EncodeJob[]
  onCallOff: (id: string) => Promise<EncodeWrite>
}) {
  return (
    <Table
      className="table-fixed"
      style={{ minWidth: TABLE_MIN }}
      containerClassName={cn(ADMIN_LIST_HEIGHT_CAP, 'overflow-y-auto pb-1')}
    >
      <TableColumns widths={COLUMNS.map((column) => column.width)} />
      <TableHeader className="[&>tr>th]:sticky [&>tr>th]:top-0 [&>tr>th]:z-10">
        <TableRow>
          {COLUMNS.map((column) => (
            <TableHead
              key={column.label}
              className={column.right ? 'text-right' : undefined}
            >
              {column.hidden ? (
                <span className="sr-only">{column.label}</span>
              ) : (
                column.label
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={job.id}>
            <TableCell className="whitespace-normal">
              <JobTitle job={job} />
            </TableCell>
            <TableCell>
              <StatusCell>
                <Standing job={job} />
              </StatusCell>
            </TableCell>
            <TableCell>{job.profileLabel ?? <Dash />}</TableCell>
            <TableCell>
              <Destination job={job} />
            </TableCell>
            <TableCell className="text-right">
              <Headway job={job} />
            </TableCell>
            <TableCell>
              <RouteCell job={job} />
            </TableCell>
            <TableCell className={STAMP}>
              <Started job={job} />
            </TableCell>
            <TableCell className={STAMP}>{job.endedAt ?? <Dash />}</TableCell>
            <TableCell className="text-right">
              {job.cancellable && (
                <CancelJobButton job={job} onCallOff={onCallOff} />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function JobTitle({ job }: { job: EncodeJob }) {
  if (job.title === undefined) {
    return <span className="text-ink-3">{RECORDING_REMOVED_LABEL}</span>
  }

  return (
    <div className={READABLE_LINE}>
      <Link
        href={`/recordings/${job.recordingId}` as Route}
        className="tap-target block text-[calc(13rem/16)] font-bold text-ink no-underline underline-offset-[3px] hover:text-brand hover:underline [font-feature-settings:'palt']"
      >
        <span className="block">{job.title}</span>
      </Link>
      {job.recordedAt && (
        <span className="block font-code text-micro text-ink-3">
          {job.recordedAt} の録画
        </span>
      )}
    </div>
  )
}

function Headway({ job }: { job: EncodeJob }) {
  if (!job.headway) {
    return <Dash />
  }

  const percent =
    job.headway.percent !== undefined ? `${job.headway.percent}%` : <Dash />
  const more = [
    job.status === 'running' && job.headway.leftSeconds !== undefined
      ? `残り ${formatLength(job.headway.leftSeconds)}`
      : undefined,
    job.status === 'running' ? `最終更新 ${job.headway.at}` : undefined,
    job.stalled && job.quietForSeconds !== undefined
      ? `${STALLED_LABEL} ${formatSpan(job.quietForSeconds)}`
      : undefined,
  ].filter((one): one is string => one !== undefined)

  if (more.length === 0) {
    return <span className="font-code text-ui tabular-nums">{percent}</span>
  }

  return (
    <InFull says={more.join('\n')}>
      <span className="inline-block font-code text-ui tabular-nums">
        {percent}
      </span>
    </InFull>
  )
}

function RouteCell({ job }: { job: EncodeJob }) {
  if (!job.route) {
    return <Dash />
  }

  return (
    <>
      <span className="block whitespace-nowrap">
        {job.route.swerved
          ? `${wordFor(ENCODER_LABEL, job.route.asked)} → ${wordFor(
              ENCODER_LABEL,
              job.route.ran,
            )}`
          : wordFor(ENCODER_LABEL, job.route.ran)}
      </span>
      {job.route.swerved && (
        <small className="block text-micro text-ink-3">
          {wordFor(SWERVE_LABEL, job.route.swerved)}
        </small>
      )}
    </>
  )
}
