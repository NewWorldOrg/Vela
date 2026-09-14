'use client'

import { useOptimistic, useState, useTransition } from 'react'

import { NOT_YET_IN_THIS_BUILD, shapeFor } from '@/lib/not-yet-in-this-build'
import {
  NOT_YET_IN_THIS_BUILD_TERM,
  RECORDING_OUTCOME_TERMS,
} from '@/lib/state-terms'
import type { EncodeAutoRun, EncodeWrite } from '@/repository/encode'
import { FEWEST_CORES } from '@/repository/encode-terms'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { InlineAlert } from '@/components/vela/banner'
import { FieldHint, FieldLabel } from '@/components/vela/field'
import { Surface } from '@/components/vela/surface'

const SIGNED_OUT = 'サインインが切れているため、保存できませんでした。'

const RUNS_ITSELF = '自動実行'

const MOST_CORES = '使用コア数の上限'

const SUBJECT = '対象'

const STILL_AS_DEPLOYED = '既定のまま'

const THE_DEFAULT = '既定'

const RUNS_ITSELF_ID = 'auto-run-runs-itself'

const MOST_CORES_ID = 'auto-run-most-cores'

const NAME = 'self-start pt-1 text-ui text-ink-3'

const VALUE = 'self-start pt-1 text-ui text-ink-2'

interface Settled {
  automatically: boolean
  mostCores: number
}

function subjectSaying(subject: EncodeAutoRun['subject']): string {
  if (subject.length === 0) {
    return NOT_YET_IN_THIS_BUILD
  }

  return subject
    .map(
      (one) =>
        shapeFor(RECORDING_OUTCOME_TERMS, one, NOT_YET_IN_THIS_BUILD_TERM)
          .label,
    )
    .join('・')
}

export function AutoRunPanel({
  autoRun,
  onSettle,
}: {
  autoRun: EncodeAutoRun
  onSettle: (automatically: boolean, mostCores: number) => Promise<EncodeWrite>
}) {
  const settled: Settled = {
    automatically: autoRun.automatically,
    mostCores: autoRun.mostCores,
  }
  const [shown, showAsIf] = useOptimistic(
    settled,
    (_: Settled, next: Settled) => next,
  )
  const [refusal, setRefusal] = useState<string>()
  const [pending, startTransition] = useTransition()

  const settle = (next: Settled) => {
    if (pending) {
      return
    }

    setRefusal(undefined)

    startTransition(async () => {
      showAsIf(next)

      const result = await onSettle(next.automatically, next.mostCores)

      if (result.state === 'unauthenticated') {
        setRefusal(SIGNED_OUT)
      }

      if (result.state === 'rejected') {
        setRefusal(result.message)
      }
    })
  }

  const cores = Array.from(
    { length: Math.max(autoRun.coresThisMachineHas - FEWEST_CORES + 1, 1) },
    (_, step) => FEWEST_CORES + step,
  )

  return (
    <Surface data-slot="auto-run">
      <dl className="grid gap-x-5 gap-y-3.5 sm:grid-cols-[minmax(0,180px)_1fr]">
        <dt className="self-start">
          <FieldLabel htmlFor={RUNS_ITSELF_ID}>{RUNS_ITSELF}</FieldLabel>
        </dt>
        <dd className="self-start">
          <Switch
            id={RUNS_ITSELF_ID}
            checked={shown.automatically}
            aria-disabled={pending}
            className="aria-disabled:cursor-not-allowed aria-disabled:opacity-45"
            onCheckedChange={(next) =>
              settle({ ...shown, automatically: next })
            }
          />
        </dd>

        <dt className="self-start pt-1">
          <FieldLabel htmlFor={MOST_CORES_ID}>{MOST_CORES}</FieldLabel>
        </dt>
        <dd className="self-start">
          <Select
            value={String(shown.mostCores)}
            onValueChange={(next) =>
              settle({ ...shown, mostCores: Number(next) })
            }
          >
            <SelectTrigger
              id={MOST_CORES_ID}
              size="sm"
              aria-disabled={pending}
              className="w-fit min-w-[150px] font-code tabular-nums"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {cores.map((count) => (
                <SelectItem
                  key={count}
                  value={String(count)}
                  className="font-code tabular-nums"
                >
                  {count}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!autoRun.stored && (
            <FieldHint className="mt-1.5 font-code tabular-nums">
              {THE_DEFAULT} {autoRun.mostCores}
            </FieldHint>
          )}
        </dd>

        <dt className={NAME}>{SUBJECT}</dt>
        <dd className={VALUE}>{subjectSaying(autoRun.subject)}</dd>
      </dl>

      <p className="mt-3.5 font-code text-note tabular-nums text-ink-3">
        {autoRun.stored && autoRun.updatedAt
          ? `${autoRun.updatedAt} 更新`
          : STILL_AS_DEPLOYED}
      </p>

      <span aria-live="polite">
        {refusal && (
          <InlineAlert tone="warn" className="mt-3">
            {refusal}
          </InlineAlert>
        )}
      </span>
    </Surface>
  )
}
