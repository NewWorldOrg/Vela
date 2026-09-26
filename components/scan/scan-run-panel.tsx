'use client'

import { EMPTY_VALUE } from '@/lib/empty-value'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import type {
  RunningScan,
  ScanAttemptRow,
  ScanRunProgress,
  WriteResult,
} from '@/repository/services'
import { SCAN_SYSTEMS, SYSTEM_LABEL } from '@/repository/scan-systems'
import { cn } from '@/lib/utils'
import { wordFor } from '@/lib/not-yet-in-this-build'
import { signedOut } from '@/lib/signed-out'
import { ADMIN_LIST_HEIGHT_CAP } from '@/components/vela/app-shell'
import { InlineAlert } from '@/components/vela/banner'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableColumns,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CheckIcon } from '@/components/vela/icons'
import { SectionHeading } from '@/components/vela/section-heading'
import { Spinner } from '@/components/vela/progress'
import { MarkAxis } from '@/components/vela/icons'
import { SegmentedControl } from '@/components/vela/segmented-control'
import { FailureLabel, FailureLegend } from '@/components/scan/failure-mark'
import { WHEN_LABELS } from '@/lib/when-terms'

const RESULT_COLUMNS: { label: string; width: string }[] = [
  { label: '物理ch', width: 'calc(112rem/16)' },
  { label: '結果', width: 'calc(240rem/16)' },
  { label: '実測', width: 'calc(200rem/16)' },
  { label: '所要', width: 'calc(112rem/16)' },
  { label: WHEN_LABELS.taken, width: 'calc(122rem/16)' },
]

function useScanTicker(running: boolean) {
  const router = useRouter()

  useEffect(() => {
    if (!running) {
      return
    }

    const timer = setInterval(() => router.refresh(), 4000)

    return () => clearInterval(timer)
  }, [running, router])
}

function AttemptResult({ attempt }: { attempt: ScanAttemptRow }) {
  if (attempt.failure === undefined) {
    return (
      <span className="inline-flex items-center gap-2 text-ui text-ink">
        <span className="inline-flex size-[calc(19rem/16)] shrink-0 items-center justify-center rounded-full bg-mint-soft">
          <CheckIcon className="size-[calc(11rem/16)] text-mint" />
        </span>
        サービスを取得
      </span>
    )
  }

  return (
    <FailureLabel failure={attempt.failure}>
      {attempt.streamMismatch}
    </FailureLabel>
  )
}

export function ScanAttemptsTable({
  attempts,
}: {
  attempts: ScanAttemptRow[]
}) {
  return (
    <Table
      className="table-fixed min-w-[calc(720rem/16)]"
      containerClassName={cn(ADMIN_LIST_HEIGHT_CAP, 'overflow-y-auto pb-1')}
    >
      <TableColumns widths={RESULT_COLUMNS.map((column) => column.width)} />
      <TableHeader className="[&>tr>th]:sticky [&>tr>th]:top-0 [&>tr>th]:z-10">
        <TableRow>
          {RESULT_COLUMNS.map((column) => (
            <TableHead key={column.label}>{column.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {attempts.map((attempt) => (
          <TableRow key={attempt.id}>
            <TableCell className="font-code text-body font-medium tabular-nums whitespace-nowrap">
              {attempt.channel}
            </TableCell>
            <TableCell>
              <AttemptResult attempt={attempt} />
            </TableCell>
            <TableCell className="font-code text-sub tabular-nums whitespace-nowrap text-ink-2">
              {attempt.measurement?.value ?? EMPTY_VALUE}
            </TableCell>
            <TableCell className="font-code text-sub tabular-nums whitespace-nowrap text-ink-2">
              {attempt.took ?? EMPTY_VALUE}
            </TableCell>
            <TableCell className="font-code text-sub tabular-nums whitespace-nowrap text-ink-2">
              {attempt.at}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function ScanCounts({ progress }: { progress: ScanRunProgress }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-[calc(18rem/16)] gap-y-1.5 text-sub text-ink-3">
      <span>
        走査済み{' '}
        <b className="font-code text-ui font-medium tabular-nums text-ink">
          {progress.attempted}
        </b>{' '}
        物理ch
      </span>
      <span>
        サービス取得{' '}
        <b className="font-code text-ui font-medium tabular-nums text-ink">
          {progress.succeeded}
        </b>
      </span>
      <span>
        失敗{' '}
        <b className="font-code text-ui font-medium tabular-nums text-ink">
          {progress.failed}
        </b>
      </span>
      <span>
        経過{' '}
        <b className="font-code text-ui font-medium tabular-nums text-ink">
          {progress.elapsed}
        </b>
      </span>
    </div>
  )
}

export function ScanRunPanel({
  running,
  onCancel,
}: {
  running: RunningScan
  onCancel: (scanId: string) => Promise<WriteResult>
}) {
  const [pending, startTransition] = useTransition()
  const [refusal, setRefusal] = useState<string>()
  const progress = running.state === 'read' ? running.progress : undefined
  const run = running.state === 'read' ? running.progress.run : running.run

  useScanTicker(run.state === 'running')

  return (
    <>
      <div className="mt-5 rounded-xl bg-surface px-[calc(18rem/16)] pt-[calc(15rem/16)] pb-4">
        <div className="mb-[calc(13rem/16)] flex flex-wrap items-center gap-[calc(11rem/16)]">
          <span className="text-ui font-medium whitespace-nowrap text-ink-2">
            スキャン範囲
          </span>
          <SegmentedControl
            aria-label="スキャン範囲"
            disabled
            options={SCAN_SYSTEMS}
            value={
              progress?.systems.length === 1 ? progress.systems[0] : undefined
            }
          />
          <span className="text-note text-ink-3">
            スキャン中は変更できません
          </span>
        </div>

        <div className="mb-3 flex flex-wrap items-start gap-3">
          <Spinner className="mt-[calc(3rem/16)] text-brand" />
          <div className="min-w-0 flex-1">
            <h2 className="heading text-ui leading-[1.5]">
              スキャン中 —{' '}
              {progress === undefined
                ? '状況を読み取れていません'
                : progress.systems.length === 0
                  ? '走査開始を待っています'
                  : progress.systems
                      .map((system) => wordFor(SYSTEM_LABEL, system))
                      .join(' · ')}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setRefusal(undefined)

                const result = await onCancel(run.id)

                setRefusal(
                  result.state === 'unauthenticated'
                    ? signedOut('キャンセル')
                    : result.state === 'rejected'
                      ? result.message
                      : undefined,
                )
              })
            }
          >
            キャンセル
          </Button>
        </div>

        {progress && <ScanCounts progress={progress} />}
      </div>

      <span aria-live="polite">
        {refusal && (
          <InlineAlert tone="warn" className="mt-2">
            {refusal}
          </InlineAlert>
        )}
      </span>

      {progress && progress.attempts.length > 0 && (
        <section className="mt-[calc(22rem/16)]">
          <SectionHeading mark={MarkAxis}>走査結果(順次)</SectionHeading>
          <FailureLegend />
          <ScanAttemptsTable attempts={progress.attempts} />
        </section>
      )}
    </>
  )
}
