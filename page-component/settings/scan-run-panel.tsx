'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import type { ScanAttemptRow, ScanRunProgress } from '@/repository/services'
import { SCAN_SYSTEMS } from '@/repository/services'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
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
import {
  FailureLabel,
  FailureLegend,
} from '@/page-component/settings/failure-mark'

const RESULT_COLUMNS = ['物理ch', '結果', '実測', '所要', '時刻']

/** Re-reads the page while a run is walking. It fetches nothing itself. */
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
        <span className="inline-flex size-[19px] shrink-0 items-center justify-center rounded-full bg-mint-soft">
          <CheckIcon className="size-[11px] text-mint" />
        </span>
        サービスを取得
      </span>
    )
  }

  return (
    <FailureLabel failure={attempt.failure}>
      {attempt.streamMismatch ?? attempt.failure.note}
    </FailureLabel>
  )
}

export function ScanAttemptsTable({
  attempts,
}: {
  attempts: ScanAttemptRow[]
}) {
  return (
    <Table className="min-w-[720px]" containerClassName="pb-1">
      <TableHeader>
        <TableRow>
          {RESULT_COLUMNS.map((column) => (
            <TableHead key={column}>{column}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {attempts.map((attempt) => (
          <TableRow key={`${attempt.channel}-${attempt.at}`}>
            <TableCell className="font-code text-[13.5px] font-medium tabular-nums whitespace-nowrap">
              {attempt.channel}
            </TableCell>
            <TableCell>
              <AttemptResult attempt={attempt} />
            </TableCell>
            <TableCell className="font-code text-sub tabular-nums whitespace-nowrap text-ink-2">
              {attempt.measurement?.value ?? '—'}
            </TableCell>
            <TableCell className="font-code text-sub tabular-nums whitespace-nowrap text-ink-2">
              {attempt.took ?? '—'}
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

/**
 * A run in flight: what it has walked so far, and the way to stop it. The
 * definitions on the page below are untouched until the result is applied, so
 * the panel says so rather than showing a list that is about to move.
 */
export function ScanRunPanel({
  progress,
  onCancel,
}: {
  progress: ScanRunProgress
  onCancel: (scanId: string) => Promise<void>
}) {
  const [pending, startTransition] = useTransition()

  useScanTicker(progress.run.state === 'running')

  return (
    <>
      <div className="mt-5 rounded-xl bg-surface px-[18px] pt-[15px] pb-4">
        <div className="mb-[13px] flex flex-wrap items-center gap-[11px]">
          <span className="text-ui font-medium whitespace-nowrap text-ink-2">
            スキャン範囲
          </span>
          <div className="pointer-events-none opacity-55">
            <SegmentedControl
              aria-label="スキャン範囲"
              options={SCAN_SYSTEMS.map(({ value, label }) => ({
                value,
                label,
              }))}
              value="isdbT"
            />
          </div>
          <span className="text-note text-ink-3">
            スキャン中は変更できません
          </span>
        </div>

        <div className="mb-3 flex flex-wrap items-start gap-3">
          <Spinner className="mt-[3px] size-[18px] text-brand" />
          <div className="min-w-0 flex-1">
            <h2 className="heading text-ui leading-[1.5]">
              スキャン中 — {progress.systems || '走査開始を待っています'}
            </h2>
            <p className="text-ui text-ink-2">
              走査した物理chから順に結果が並びます。定義の書き換えはまだ起きていません
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await onCancel(progress.run.id)
              })
            }
          >
            キャンセル
          </Button>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-[18px] gap-y-1.5 text-sub text-ink-3">
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

        <p className="mt-[11px] border-t border-dashed border-line pt-[11px] text-note leading-[1.7] text-ink-2">
          キャンセルした場合も既存の定義は変わりません。録画・ライブ・EPG
          収集が優先され、必要になればスキャンは中断されます。
        </p>
      </div>

      {progress.attempts.length > 0 && (
        <section className="mt-[22px]">
          <SectionHeading mark={MarkAxis}>走査結果(順次)</SectionHeading>
          <FailureLegend />
          <ScanAttemptsTable attempts={progress.attempts} />
        </section>
      )}
    </>
  )
}
