import Link from 'next/link'
import type { Route } from 'next'

import { cn } from '@/lib/utils'
import { formatLength, formatSpan } from '@/lib/format'
import type { EncodeJob, EncodeWrite } from '@/repository/encode'
import {
  ENCODER_LABEL,
  FAILURE_LABEL,
  RECORDING_REMOVED_LABEL,
  SWERVE_LABEL,
} from '@/repository/encode-terms'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ADMIN_LIST_HEIGHT_CAP } from '@/components/vela/app-shell'
import { CancelJobButton } from '@/components/encode/cancel-job-button'
import { JobStatusChip } from '@/components/encode/job-status-chip'

const COLUMNS: { label: string; hidden?: boolean }[] = [
  { label: '番組' },
  { label: '状態' },
  { label: 'プロファイル' },
  { label: '保存先' },
  { label: '進捗' },
  { label: '経路' },
  { label: '登録' },
  { label: '開始' },
  { label: '終了' },
  { label: '操作', hidden: true },
]

const STAMP = 'font-code text-sub tabular-nums whitespace-nowrap text-ink-2'

function Dash() {
  return <span className="text-ink-3">—</span>
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
      className="min-w-[1180px]"
      containerClassName={cn(ADMIN_LIST_HEIGHT_CAP, 'overflow-y-auto pb-1')}
    >
      <TableHeader className="[&>tr>th]:sticky [&>tr>th]:top-0 [&>tr>th]:z-10">
        <TableRow>
          {COLUMNS.map((column) => (
            <TableHead key={column.label}>
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
            <TableCell className="max-w-[320px] whitespace-normal">
              <JobTitle job={job} />
            </TableCell>
            <TableCell>
              <JobStatusChip status={job.status} stalled={job.stalled} />
              {job.failure && (
                <span
                  className="mt-[3px] block max-w-[240px] truncate text-[10.5px] leading-relaxed text-ink-3"
                  title={job.failure.note || undefined}
                >
                  {FAILURE_LABEL[job.failure.failure]}
                </span>
              )}
              {job.attempt > 1 && (
                <span className="mt-[3px] block font-code text-[10.5px] text-ink-3">
                  {job.attempt} 回目
                </span>
              )}
            </TableCell>
            <TableCell>{job.profileLabel ?? <Dash />}</TableCell>
            <TableCell>
              {job.destinationLabel ?? <Dash />}
              <small className="block font-code text-[10.5px] text-ink-3">
                {job.outputRoot}
              </small>
            </TableCell>
            <TableCell>
              <Headway job={job} />
            </TableCell>
            <TableCell>
              <RouteCell job={job} />
            </TableCell>
            <TableCell className={STAMP}>{job.queuedAt}</TableCell>
            <TableCell className={STAMP}>{job.startedAt ?? <Dash />}</TableCell>
            <TableCell className={STAMP}>{job.endedAt ?? <Dash />}</TableCell>
            <TableCell className="text-right">
              {job.cancellable && (
                <CancelJobButton id={job.id} onCallOff={onCallOff} />
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
    <>
      <Link
        href={`/recordings/${job.recordingId}` as Route}
        className="tap-target block max-w-[300px] text-[13px] font-bold text-ink no-underline underline-offset-[3px] hover:text-brand hover:underline [font-feature-settings:'palt']"
      >
        <span className="block truncate">{job.title}</span>
      </Link>
      {job.recordedAt && (
        <span className="block font-code text-[10.5px] text-ink-3">
          {job.recordedAt} の録画
        </span>
      )}
    </>
  )
}

function Headway({ job }: { job: EncodeJob }) {
  if (!job.headway) {
    return <Dash />
  }

  return (
    <span className="block font-code text-ui tabular-nums">
      {job.headway.percent !== undefined ? `${job.headway.percent}%` : <Dash />}
      {job.status === 'running' && job.headway.leftSeconds !== undefined && (
        <small className="block text-[10.5px] text-ink-3">
          残り {formatLength(job.headway.leftSeconds)}
        </small>
      )}
      {job.status === 'running' && (
        <small className="block text-[10.5px] text-ink-3">
          最終更新 {job.headway.at}
        </small>
      )}
      {job.stalled && job.quietForSeconds !== undefined && (
        <small className="block text-[10.5px] text-lemon">
          停滞 {formatSpan(job.quietForSeconds)}
        </small>
      )}
    </span>
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
          ? `${ENCODER_LABEL[job.route.asked]} → ${ENCODER_LABEL[job.route.ran]}`
          : ENCODER_LABEL[job.route.ran]}
      </span>
      {job.route.swerved && (
        <small className="block text-[10.5px] text-ink-3">
          {SWERVE_LABEL[job.route.swerved]}
        </small>
      )}
    </>
  )
}
