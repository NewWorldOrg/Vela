'use client'

import { useState, useTransition, type FormEvent } from 'react'

import type { ThresholdDraft, ThresholdDrafts } from '@/lib/quality'
import {
  isChanged,
  thresholdFormProblems,
  thresholdWrites,
} from '@/lib/quality'
import { signedOut } from '@/lib/signed-out'
import type {
  QualityThreshold,
  QualityThresholdKey,
  QualityThresholdSaved,
  QualityThresholdWrite,
  QualityWrite,
} from '@/repository/quality'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/vela/inline-alert'
import { SectionHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'
import { ThresholdRow, SAVED } from '@/components/quality/threshold-row'

export type QualitySaveThresholds = (
  writes: QualityThresholdWrite[],
) => Promise<QualityThresholdSaved[]>

export type RowOutcome =
  { state: 'saved' } | { state: 'refused'; message: string }

type RowOutcomes = Partial<Record<QualityThresholdKey, RowOutcome>>

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
      <SectionHeading>適用中の閾値</SectionHeading>
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
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2.5 border-t border-hair pt-3">
            <span aria-live="polite" className="mr-auto min-w-0">
              {!editing && saved && (
                <span className="text-note text-ink">{SAVED}</span>
              )}
              {editing && refusal && (
                <InlineAlert tone="warn">{refusal}</InlineAlert>
              )}
            </span>
            {editing ? (
              <>
                <Button
                  type="button"
                  variant="tone"
                  disabled={pending}
                  onClick={leave}
                >
                  キャンセル
                </Button>
                <Button type="submit" disabled={!changed}>
                  保存
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="tone"
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
