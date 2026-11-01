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
  REMAKE_LABEL,
  REPLACED_IN_FULL,
  STALLED_LABEL,
  SWERVE_LABEL,
} from '@/repository/encode-terms'
import {
  Table,
  TableBody,
  TableColumns,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cardPlace, READABLE_LINE } from '@/components/ui/table-cards'
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
  width: string | undefined
  hidden?: boolean
  right?: boolean
}

/**
 * The profile and the destination are said on the line under the programme,
 * and the end under the start, so the table fits the settings frame.
 */
const COLUMNS: Column[] = [
  { label: '番組', width: undefined },
  { label: '状態', width: JOB_STATUS_COLUMN },
  { label: '進捗', width: 'calc(64rem/16)', right: true },
  { label: '経路', width: 'calc(150rem/16)' },
  { label: '開始', width: 'calc(146rem/16)' },
  { label: '操作', width: 'calc(96rem/16)', hidden: true },
]

const TABLE_MIN = 'min-w-[calc(820rem/16)]'

const STAMP = 'text-sub tabular-nums whitespace-nowrap text-ink-2'

const BESIDE = 'block text-note tabular-nums text-ink-2'

function Standing({ job }: { job: EncodeJob }) {
  const chip = (
    <JobStatusChip
      status={job.status}
      stalled={job.stalled}
      replaced={job.replacedAt !== undefined}
      say
    />
  )
  const why = whyItStands(job)

  return why ? (
    <InFull says={why} wraps="inline-flex">
      {chip}
    </InFull>
  ) : (
    chip
  )
}

function whyItStands(job: EncodeJob): string {
  return [
    job.replacedAt && REPLACED_IN_FULL,
    job.replacedAt && `置き換え ${job.replacedAt}`,
    job.failure && wordFor(FAILURE_LABEL, job.failure.failure),
    job.remade && wordFor(REMAKE_LABEL, job.remade),
    job.attempt > 1 ? `${job.attempt} 回目` : undefined,
  ]
    .filter((one): one is string => Boolean(one))
    .join('\n')
}

function Dash() {
  return <span className="font-sans text-ink-2">{EMPTY_VALUE}</span>
}

function Started({ job }: { job: EncodeJob }) {
  return (
    <InFull says={`登録 ${job.queuedAt}`} wraps="inline-block">
      {job.startedAt ?? <Dash />}
    </InFull>
  )
}

function Destination({ job }: { job: EncodeJob }) {
  const said = job.destinationLabel ?? <Dash />

  return (
    <InFull says={job.outputRoot} wraps="inline-block">
      {said}
    </InFull>
  )
}

export function JobTable({
  jobs,
  onCallOff,
  waiting = false,
}: {
  jobs: EncodeJob[]
  onCallOff: (id: string) => Promise<EncodeWrite>
  waiting?: boolean
}) {
  return (
    <Table
      cards
      waiting={waiting}
      className={cn('table-fixed', TABLE_MIN)}
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
            <TableCell {...cardPlace('lead')} className="whitespace-normal">
              <JobTitle job={job} />
            </TableCell>
            <TableCell {...cardPlace('field', '状態')}>
              <StatusCell>
                <Standing job={job} />
              </StatusCell>
            </TableCell>
            <TableCell {...cardPlace('field', '進捗')} className="text-right">
              <Headway job={job} />
            </TableCell>
            <TableCell {...cardPlace('field', '経路')}>
              <RouteCell job={job} />
            </TableCell>
            <TableCell {...cardPlace('field', '開始')} className={STAMP}>
              <Started job={job} />
              <span data-slot="job-ended" className={BESIDE}>
                終了 {job.endedAt ?? EMPTY_VALUE}
              </span>
            </TableCell>
            <TableCell {...cardPlace('actions')} className="text-right">
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

function JobMade({ job }: { job: EncodeJob }) {
  return (
    <span
      data-slot="job-made"
      className="flex flex-wrap gap-x-3 text-note text-ink-2"
    >
      <span>
        プロファイル{' '}
        <span className="text-ink">{job.profileLabel ?? EMPTY_VALUE}</span>
      </span>
      <span>
        保存先{' '}
        <span className="text-ink">
          <Destination job={job} />
        </span>
      </span>
    </span>
  )
}

function JobTitle({ job }: { job: EncodeJob }) {
  if (job.title === undefined) {
    return (
      <div className={READABLE_LINE}>
        <span className="block text-ink-2">{RECORDING_REMOVED_LABEL}</span>
        <JobMade job={job} />
      </div>
    )
  }

  return (
    <div className={READABLE_LINE}>
      <Link
        href={`/recordings/${job.recordingId}` as Route}
        className="tap-target block text-ui leading-[calc(22rem/16)] font-semibold text-ink no-underline underline-offset-[3px] hover:text-acc-text hover:underline [font-feature-settings:'palt']"
      >
        <span className="block">{job.title}</span>
      </Link>
      {job.recordedAt && (
        <span className={BESIDE}>{job.recordedAt} の録画</span>
      )}
      <JobMade job={job} />
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
    return <span className="text-ui tabular-nums">{percent}</span>
  }

  return (
    <InFull says={more.join('\n')} wraps="inline-block text-ui tabular-nums">
      {percent}
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
        <small className="block text-micro text-ink-2">
          {wordFor(SWERVE_LABEL, job.route.swerved)}
        </small>
      )}
    </>
  )
}
