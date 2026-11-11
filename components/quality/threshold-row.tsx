'use client'

import type { ThresholdDraft } from '@/lib/quality'
import { shownInForm } from '@/lib/quality'
import { shapeFor } from '@/lib/not-yet-in-this-build'
import type {
  QualityThreshold,
  QualityThresholdSource,
} from '@/repository/quality'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldError } from '@/components/vela/field'
import type { RowOutcome } from '@/components/quality/threshold-panel'

export const SAVED = '保存しました。'

const SOURCE_BADGES: Record<QualityThresholdSource, 'ok' | 'mute' | undefined> =
  {
    shipped: undefined,
    measured: 'ok',
    byHand: 'mute',
  }

export function ThresholdRow({
  threshold,
  editing,
  first,
  draft,
  problem,
  outcome,
  pending,
  onDraft,
}: {
  threshold: QualityThreshold
  editing: boolean
  first: boolean
  draft?: ThresholdDraft
  problem?: string
  outcome?: RowOutcome
  pending: boolean
  onDraft: (next?: ThresholdDraft) => void
}) {
  const id = `threshold-${threshold.key}`
  const errorId = `${id}-error`
  const nameId = `${id}-name`
  const said =
    problem ?? (outcome?.state === 'refused' ? outcome.message : undefined)
  const released = draft?.kind === 'released'

  return (
    <div
      data-slot="threshold-row"
      className="border-b border-hair pb-2 last:border-b-0 last:pb-0"
    >
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        {editing ? (
          <label id={nameId} htmlFor={id} className="text-ui font-bold">
            {threshold.label}
          </label>
        ) : (
          <span className="text-ui font-bold">{threshold.label}</span>
        )}
        <span className="text-ui font-semibold tabular-nums text-ink">
          {threshold.value}
        </span>
        {threshold.sourceLabel && (
          <Badge
            variant={
              shapeFor(SOURCE_BADGES, threshold.source, undefined) ?? 'mute'
            }
          >
            {threshold.sourceLabel}
          </Badge>
        )}
        {threshold.basis && (
          <span className="w-full font-code text-note text-ink-2">
            {threshold.basis}
          </span>
        )}
      </div>
      {editing && (
        <>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className="flex items-center gap-1.5">
              <Input
                id={id}
                inputMode="decimal"
                autoComplete="off"
                autoFocus={first}
                areaClassName="w-[calc(150rem/16)]"
                className="font-code tabular-nums"
                value={shownInForm(threshold, draft)}
                readOnly={pending}
                disabled={released}
                aria-invalid={said ? true : undefined}
                aria-describedby={said ? errorId : undefined}
                onChange={(event) =>
                  onDraft({ kind: 'typed', text: event.target.value })
                }
              />
              {threshold.unit && (
                <span className="text-sub text-ink-2">{threshold.unit}</span>
              )}
            </span>
            {threshold.source === 'byHand' && (
              <Button
                type="button"
                variant="tone"
                size="sm"
                className="ml-auto"
                aria-describedby={nameId}
                disabled={pending}
                onClick={() =>
                  onDraft(released ? undefined : { kind: 'released' })
                }
              >
                {released ? '取り消し' : '手動設定を解除'}
              </Button>
            )}
          </div>
          <span aria-live="polite">
            {said && (
              <FieldError id={errorId} className="mt-1.5">
                {said}
              </FieldError>
            )}
            {outcome?.state === 'saved' && (
              <span className="mt-1.5 block text-note text-ink">{SAVED}</span>
            )}
          </span>
        </>
      )}
    </div>
  )
}
