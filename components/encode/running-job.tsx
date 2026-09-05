import Link from 'next/link'
import type { Route } from 'next'

import { formatLength, formatSpan } from '@/lib/format'
import type { EncodeJob } from '@/repository/encode'
import {
  ENCODER_LABEL,
  RECORDING_REMOVED_LABEL,
  STALLED_LABEL,
  SWERVE_LABEL,
} from '@/repository/encode-terms'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EncodeIcon } from '@/components/vela/icons'
import { ProgressBar } from '@/components/vela/progress'
import { ChipDot } from '@/components/vela/status'
import { Surface } from '@/components/vela/surface'

export function RunningJob({ job }: { job: EncodeJob }) {
  const percent = job.headway?.percent

  return (
    <Surface data-slot="running-job">
      <div className="flex flex-wrap items-center gap-2.5">
        <EncodeIcon className="size-[17px] text-brand" />
        <b className="heading min-w-0 flex-1 truncate text-[15px]">
          {job.title ?? (
            <span className="text-ink-3">{RECORDING_REMOVED_LABEL}</span>
          )}
        </b>
        {job.stalled && (
          <Badge variant="warn" className="font-bold">
            <ChipDot />
            {STALLED_LABEL}
          </Badge>
        )}
        <span className="font-code text-[15px] font-medium tabular-nums text-brand">
          {percent !== undefined ? `${percent}%` : '—'}
        </span>
      </div>
      <ProgressBar
        value={percent ?? 0}
        tone={job.stalled ? 'warn' : 'brand'}
        label="エンコードの進捗"
        className="mt-2.5 h-1.5"
      />
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 font-code text-note tabular-nums text-ink-3">
        {job.recordedAt && <span>{job.recordedAt} の録画</span>}
        {job.elapsedSeconds !== undefined && (
          <span>経過 {formatLength(job.elapsedSeconds)}</span>
        )}
        {job.headway?.leftSeconds !== undefined && (
          <span>残り {formatLength(job.headway.leftSeconds)}</span>
        )}
        {job.headway && <span>最終更新 {job.headway.at}</span>}
        {job.stalled && job.quietForSeconds !== undefined && (
          <span className="text-lemon">
            {STALLED_LABEL} {formatSpan(job.quietForSeconds)}
          </span>
        )}
        {job.route && (
          <span>
            {job.route.swerved
              ? `${ENCODER_LABEL[job.route.asked]} → ${ENCODER_LABEL[job.route.ran]}(${SWERVE_LABEL[job.route.swerved]})`
              : ENCODER_LABEL[job.route.ran]}
          </span>
        )}
      </div>
      {job.title !== undefined && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/recordings/${job.recordingId}` as Route}>
              録画詳細を開く
            </Link>
          </Button>
        </div>
      )}
    </Surface>
  )
}
