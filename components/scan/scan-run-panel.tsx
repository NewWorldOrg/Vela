'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import type {
  RunningScan,
  ScanRunProgress,
  WriteResult,
} from '@/repository/services'
import { SCAN_SYSTEMS, SYSTEM_LABEL } from '@/repository/scan-systems'
import { wordFor } from '@/lib/not-yet-in-this-build'
import { signedOut } from '@/lib/signed-out'
import { InlineAlert } from '@/components/vela/inline-alert'
import { Button } from '@/components/ui/button'
import { SectionHeading } from '@/components/vela/section-heading'
import { Spinner } from '@/components/vela/spinner'
import { SegmentedControl } from '@/components/vela/segmented-control'
import { FailureLegend } from '@/components/scan/failure-legend'
import { ScanAttemptsTable } from '@/components/scan/scan-attempts-table'

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

function ScanCounts({ progress }: { progress: ScanRunProgress }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-[calc(18rem/16)] gap-y-1.5 text-sub text-ink-2">
      <span>
        スキャン済み{' '}
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
      <div className="mt-4 rounded-lg bg-surface px-4 pt-3.5 pb-4">
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
        </div>

        <div className="mb-3 flex flex-wrap items-start gap-3">
          <Spinner className="mt-[calc(3rem/16)] text-accent" />
          <div className="min-w-0 flex-1">
            <h2 className="heading text-ui leading-[1.5]">
              スキャン中 —{' '}
              {progress === undefined
                ? '状況不明'
                : progress.systems.length === 0
                  ? 'スキャン開始待ち'
                  : progress.systems
                      .map((system) => wordFor(SYSTEM_LABEL, system))
                      .join(' · ')}
            </h2>
          </div>
          <Button
            variant="tone"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setRefusal(undefined)

                const result = await onCancel(run.id)

                setRefusal(
                  result.state === 'unauthenticated'
                    ? signedOut('中止')
                    : result.state === 'rejected'
                      ? result.message
                      : undefined,
                )
              })
            }
          >
            中止
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
          <SectionHeading>スキャン結果(順次)</SectionHeading>
          <FailureLegend />
          <ScanAttemptsTable attempts={progress.attempts} />
        </section>
      )}
    </>
  )
}
