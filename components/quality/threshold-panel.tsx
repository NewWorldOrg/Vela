'use client'

import { useState, useTransition, type FormEvent } from 'react'

import type { ThresholdDraft, ThresholdDrafts } from '@/lib/quality'
import {
  isChanged,
  shownInForm,
  thresholdFormProblems,
  thresholdWrites,
} from '@/lib/quality'
import { shapeFor } from '@/lib/not-yet-in-this-build'
import { signedOut } from '@/lib/signed-out'
import type {
  QualityThreshold,
  QualityThresholdKey,
  QualityThresholdSaved,
  QualityThresholdSource,
  QualityThresholdWrite,
  QualityWrite,
} from '@/repository/quality'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InlineAlert } from '@/components/vela/banner'
import { FieldError } from '@/components/vela/field'
import { MarkPill } from '@/components/vela/icons'
import { SectionHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'

export type QualitySaveThresholds = (
  writes: QualityThresholdWrite[],
) => Promise<QualityThresholdSaved[]>

type RowOutcome = { state: 'saved' } | { state: 'refused'; message: string }

type RowOutcomes = Partial<Record<QualityThresholdKey, RowOutcome>>

const SAVED = '保存しました。'

const SOURCE_BADGES: Record<QualityThresholdSource, 'ok' | 'mute' | undefined> =
  {
    shipped: undefined,
    measured: 'ok',
    byHand: 'mute',
  }

function outcomeOf(write: QualityWrite): RowOutcome | undefined {
  if (write.state === 'ok') {
    return { state: 'saved' }
  }

  return write.state === 'rejected'
    ? { state: 'refused', message: write.message }
    : undefined
}

function outcomesOf(settled: QualityThresholdSaved[]): RowOutcomes {
  const outcomes: RowOutcomes = {}

  for (const { key, write } of settled) {
    outcomes[key] = outcomeOf(write)
  }

  return outcomes
}

function without(
  drafts: ThresholdDrafts,
  keys: QualityThresholdKey[],
): ThresholdDrafts {
  const kept: ThresholdDrafts = { ...drafts }

  for (const key of keys) {
    delete kept[key]
  }

  return kept
}

export function ThresholdPanel({
  thresholds,
  onSave,
}: {
  thresholds: QualityThreshold[]
  onSave: QualitySaveThresholds
}) {
  const [editing, setEditing] = useState(false)
  const [drafts, setDrafts] = useState<ThresholdDrafts>({})
  const [checking, setChecking] = useState(false)
  const [outcomes, setOutcomes] = useState<RowOutcomes>({})
  const [refusal, setRefusal] = useState<string>()
  const [saved, setSaved] = useState(false)
  const [returned, setReturned] = useState(false)
  const [pending, startTransition] = useTransition()

  const problems = checking ? thresholdFormProblems(thresholds, drafts) : {}
  const changed = thresholds.some((one) => isChanged(one, drafts[one.key]))

  const edit = () => {
    setEditing(true)
    setSaved(false)
  }

  const leave = () => {
    setEditing(false)
    setDrafts({})
    setChecking(false)
    setOutcomes({})
    setRefusal(undefined)
    setReturned(true)
  }

  const redraft = (key: QualityThresholdKey, next?: ThresholdDraft) => {
    setDrafts((now) => ({ ...now, [key]: next }))
    setOutcomes((now) => ({ ...now, [key]: undefined }))
  }

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!editing || !changed || pending) {
      return
    }

    setChecking(true)

    if (Object.keys(thresholdFormProblems(thresholds, drafts)).length > 0) {
      return
    }

    const writes = thresholdWrites(thresholds, drafts)

    setOutcomes({})
    setRefusal(undefined)

    startTransition(async () => {
      const settled = await onSave(writes)
      const passed = settled
        .filter((one) => one.write.state === 'ok')
        .map((one) => one.key)

      if (passed.length === writes.length) {
        leave()
        setSaved(true)

        return
      }

      setDrafts((now) => without(now, passed))
      setOutcomes(outcomesOf(settled))
      setRefusal(
        settled.some((one) => one.write.state === 'unauthenticated')
          ? signedOut('保存')
          : undefined,
      )
    })
  }

  return (
    <Surface>
      <SectionHeading mark={MarkPill}>適用中の閾値</SectionHeading>
      <form noValidate onSubmit={save}>
        <div className="space-y-2">
          {thresholds.map((threshold, index) => (
            <ThresholdRow
              key={threshold.key}
              threshold={threshold}
              editing={editing}
              first={index === 0}
              draft={drafts[threshold.key]}
              problem={problems[threshold.key]}
              outcome={outcomes[threshold.key]}
              pending={pending}
              onDraft={(next) => redraft(threshold.key, next)}
            />
          ))}
        </div>
        {thresholds.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2.5 border-t border-dashed border-line pt-3">
            <span aria-live="polite" className="mr-auto min-w-0">
              {!editing && saved && (
                <span className="text-note text-mint">{SAVED}</span>
              )}
              {editing && refusal && (
                <InlineAlert tone="warn">{refusal}</InlineAlert>
              )}
            </span>
            {editing ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  onClick={leave}
                >
                  キャンセル
                </Button>
                <Button type="submit" disabled={!changed || pending}>
                  保存
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="change"
                size="sm"
                autoFocus={returned}
                onClick={edit}
              >
                変更
              </Button>
            )}
          </div>
        )}
      </form>
    </Surface>
  )
}

function ThresholdRow({
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
  const said =
    problem ?? (outcome?.state === 'refused' ? outcome.message : undefined)
  const released = draft?.kind === 'released'

  return (
    <div
      data-slot="threshold-row"
      className="border-b border-dashed border-line pb-2 last:border-b-0 last:pb-0"
    >
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        {editing ? (
          <label htmlFor={id} className="text-ui font-bold">
            {threshold.label}
          </label>
        ) : (
          <span className="text-ui font-bold">{threshold.label}</span>
        )}
        <span className="font-code text-ui tabular-nums text-brand">
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
          <span className="w-full font-code text-note text-ink-3">
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
                disabled={pending || released}
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
                variant="halt"
                size="sm"
                className="ml-auto"
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
              <span className="mt-1.5 block text-note text-mint">{SAVED}</span>
            )}
          </span>
        </>
      )}
    </div>
  )
}
