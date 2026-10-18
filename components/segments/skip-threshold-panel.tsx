'use client'

import { useId, useState, useTransition, type FormEvent } from 'react'

import {
  NOT_APPLICABLE,
  skipThresholdProblem,
  skipThresholdRefusalOf,
  skipThresholdToSend,
  thresholdOf,
} from '@/lib/segment-detection'
import type { SkipThreshold } from '@/repository/segment-status'
import type { SkipThresholdWrite } from '@/repository/segments'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldError } from '@/components/vela/field'
import { Spinner } from '@/components/vela/progress'
import { Surface } from '@/components/vela/surface'
import { ValueRow, ValueRows } from '@/components/segments/value-rows'

export const SKIP_THRESHOLD_SLOT = 'skip-threshold'

const THRESHOLD = '閾値'

const RECOMMENDED = 'おすすめの値'

export type SettleSkipThreshold = (
  threshold: number,
) => Promise<SkipThresholdWrite>

export function SkipThresholdPanel({
  threshold,
  onSettle,
}: {
  threshold: SkipThreshold
  onSettle: SettleSkipThreshold
}) {
  const [editing, setEditing] = useState(false)
  const [typed, setTyped] = useState('')
  const [checking, setChecking] = useState(false)
  const [refusal, setRefusal] = useState<string>()
  const [returned, setReturned] = useState(false)
  const [pending, startTransition] = useTransition()
  const id = useId()
  const errorId = `${id}-error`
  const said = (checking ? skipThresholdProblem(typed) : undefined) ?? refusal
  const { current, recommended } = threshold

  const edit = () => {
    setTyped(thresholdOf(current))
    setChecking(false)
    setRefusal(undefined)
    setEditing(true)
  }

  const leave = () => {
    setEditing(false)
    setChecking(false)
    setRefusal(undefined)
    setReturned(true)
  }

  const retype = (next: string) => {
    setTyped(next)
    setRefusal(undefined)
  }

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!editing || pending) {
      return
    }

    setChecking(true)
    setRefusal(undefined)

    if (skipThresholdProblem(typed) !== undefined) {
      return
    }

    const next = skipThresholdToSend(typed)

    startTransition(async () => {
      const result = await onSettle(next)

      if (result.state === 'ok') {
        leave()

        return
      }

      setRefusal(skipThresholdRefusalOf(result.state))
    })
  }

  return (
    <Surface data-slot={SKIP_THRESHOLD_SLOT}>
      <form noValidate onSubmit={save}>
        <ValueRows>
          <ValueRow
            name={editing ? <label htmlFor={id}>{THRESHOLD}</label> : THRESHOLD}
          >
            {editing ? (
              <span className="flex flex-wrap items-center gap-2.5 font-sans">
                <Input
                  id={id}
                  inputMode="decimal"
                  autoComplete="off"
                  autoFocus
                  areaClassName="w-[calc(110rem/16)]"
                  className="font-code tabular-nums"
                  value={typed}
                  readOnly={pending}
                  aria-invalid={said ? true : undefined}
                  aria-describedby={said ? errorId : undefined}
                  onChange={(event) => retype(event.target.value)}
                />
                {recommended !== undefined && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => retype(thresholdOf(recommended))}
                  >
                    {RECOMMENDED}
                  </Button>
                )}
              </span>
            ) : (
              thresholdOf(current)
            )}
          </ValueRow>
          <ValueRow name={RECOMMENDED}>
            {recommended === undefined
              ? NOT_APPLICABLE
              : thresholdOf(recommended)}
          </ValueRow>
        </ValueRows>
        <span aria-live="polite">
          {editing && said && (
            <FieldError id={errorId} className="mt-2.5">
              {said}
            </FieldError>
          )}
        </span>
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2.5 border-t border-dashed border-line pt-3">
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
              <Button type="submit" aria-disabled={pending}>
                {pending && <Spinner size="control" />}
                保存する
              </Button>
            </>
          ) : (
            <Button
              key="change"
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
      </form>
    </Surface>
  )
}
