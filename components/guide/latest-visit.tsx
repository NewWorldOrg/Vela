'use client'

import { STREAM_OUTCOME_LABEL, streamLabel } from '@/lib/collection'
import { wordFor } from '@/lib/not-yet-in-this-build'
import type { CollectionStatus } from '@/repository/collection'
import { AntennaIcon, SuccessIcon } from '@/components/vela/icons'
import { Figure } from '@/components/guide/figure'

export function LatestVisit({ status }: { status: CollectionStatus }) {
  const rows = status.streams

  if (rows.length > 0 && rows.every((row) => row.outcome === 'complete')) {
    return (
      <div className="flex items-start gap-[calc(11rem/16)] rounded-xl bg-surface-2 px-3.5 py-3">
        <span className="relative mt-0.5 shrink-0">
          <AntennaIcon
            className="size-[calc(30rem/16)] text-mint"
            strokeWidth={1.5}
          />
          <SuccessIcon className="absolute -right-1 -bottom-0.5 size-3.5 text-mint" />
        </span>
        <div className="min-w-0">
          <b className="block text-sub font-bold text-mint">
            巡回は完了しています
          </b>
          <span className="block text-note leading-[1.7] text-ink-2">
            全 <Figure>{rows.length}</Figure> TS が
            {STREAM_OUTCOME_LABEL.complete}。
          </span>
        </div>
      </div>
    )
  }

  const latest = rows
    .filter((row) => row.lastAttemptedAt !== undefined)
    .sort((a, b) => (a.lastAttemptedAt! < b.lastAttemptedAt! ? 1 : -1))[0]

  if (!latest) {
    return (
      <div className="rounded-xl bg-surface-2 px-3.5 py-3 text-note leading-[1.7] text-ink-2">
        まだどの TS も訪問していません。
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-surface-2 px-3.5 py-3">
      <b className="block text-sub font-bold">
        最終訪問 —{' '}
        <span className="font-code font-medium tabular-nums">
          {streamLabel(latest)}
          {latest.channelLabel ? `(${latest.channelLabel})` : ''}
        </span>
        {latest.name}
      </b>
      <span className="mt-0.5 flex flex-wrap gap-x-3.5 text-note leading-[1.7] text-ink-2">
        <span>
          結果 {wordFor(STREAM_OUTCOME_LABEL, latest.outcome)}
          {latest.lastAttemptedLabel && (
            <>
              ・<Figure>{latest.lastAttemptedLabel}</Figure>
            </>
          )}
        </span>
      </span>
    </div>
  )
}
