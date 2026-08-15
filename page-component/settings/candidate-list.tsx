'use client'

import { useState, useTransition } from 'react'

import type { CandidateRow, WriteResult } from '@/repository/services'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/vela/banner'
import { ProgressBar } from '@/components/vela/progress'

function CandidateMeter({ candidate }: { candidate: CandidateRow }) {
  if (candidate.measurement === undefined) {
    return (
      <span className="w-[280px] max-w-full text-sub text-ink-3">
        同調しないため測定できていません
      </span>
    )
  }

  return (
    <span className="flex max-w-[280px] flex-1 items-center gap-[9px]">
      <ProgressBar
        value={candidate.measurement.percent}
        tone={candidate.measurement.tone}
        label={`${candidate.channel} ${candidate.measurement.value}`}
        className="h-1.5 flex-1"
      />
      <span className="w-16 text-right font-code text-sub tabular-nums text-ink-2">
        {candidate.measurement.value}
      </span>
    </span>
  )
}

/**
 * The candidates behind one service. Which one is selected is stated on the
 * row itself, and every other row carries the switch to it — so moving the
 * selection is a decision made in one place, not a side effect of a scan.
 */
export function CandidateList({
  serviceKey,
  candidates,
  onSelect,
}: {
  serviceKey: string
  candidates: CandidateRow[]
  onSelect: (
    serviceKey: string,
    candidateChannelId: string,
  ) => Promise<WriteResult>
}) {
  const [pending, startTransition] = useTransition()
  const [refusal, setRefusal] = useState<string>()

  return (
    <>
      <p className="mb-[9px] text-cap font-bold text-ink-3">
        候補チャンネル — 実測順(受信可 → 品質)。切替は次回の選局から有効
      </p>
      {candidates.map((candidate) => (
        <div
          key={candidate.id}
          className={
            candidate.selected
              ? 'mb-1.5 flex flex-wrap items-center gap-4 rounded-lg border border-brand-line bg-brand-soft px-3.5 py-2.5'
              : 'mb-1.5 flex flex-wrap items-center gap-4 rounded-lg border border-transparent bg-surface px-3.5 py-2.5'
          }
        >
          <span className="w-[52px] font-code text-[13.5px] font-medium tabular-nums">
            {candidate.channel}
          </span>
          <CandidateMeter candidate={candidate} />
          {candidate.rotation && (
            <Badge variant="warn" className="font-bold">
              {candidate.rotation.label}
            </Badge>
          )}
          <span className="font-code text-cap tabular-nums whitespace-nowrap text-ink-3">
            発見 {candidate.discovered} · 評価 {candidate.lastSeen}
            {candidate.rotation && ` · ${candidate.rotation.note}`}
          </span>
          {candidate.selected ? (
            <span className="ml-auto rounded-full border border-brand-line bg-surface px-[11px] py-[3px] text-note font-bold whitespace-nowrap text-brand">
              ● 選択中
            </span>
          ) : (
            <span className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    setRefusal(undefined)

                    const result = await onSelect(serviceKey, candidate.id)

                    setRefusal(
                      result.state === 'unauthenticated'
                        ? 'サインインが切れているため、切り替えられませんでした。サインインしてから開き直してください。'
                        : result.state === 'rejected'
                          ? result.message
                          : undefined,
                    )
                  })
                }
              >
                これに切替
              </Button>
            </span>
          )}
        </div>
      ))}
      <span aria-live="polite">
        {refusal && <InlineAlert tone="warn">{refusal}</InlineAlert>}
      </span>
    </>
  )
}
