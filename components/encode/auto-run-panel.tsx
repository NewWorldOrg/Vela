'use client'

import { useOptimistic, useState, useTransition } from 'react'

import { shapeFor } from '@/lib/not-yet-in-this-build'
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
import { Surface } from '@/components/vela/surface'

const SIGNED_OUT = 'サインインが切れているため、保存できませんでした。'

const RUNS_ITSELF = '自動実行'

const MOST_CORES = '使用コア数の上限'

const SUBJECT = '対象'

const STILL_AS_DEPLOYED = '既定のまま'

const THE_DEFAULT = '既定'

const LABEL = 'heading self-start pt-1 text-ui text-ink'

interface Settled {
  automatically: boolean
  mostCores: number
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
      <div className="grid gap-x-5 gap-y-3.5 sm:grid-cols-[minmax(0,180px)_1fr]">
        <span id="auto-run-runs-itself" className={LABEL}>
          {RUNS_ITSELF}
        </span>
        <div>
          <Switch
            checked={shown.automatically}
            aria-labelledby="auto-run-runs-itself"
            aria-disabled={pending}
            className="aria-disabled:cursor-not-allowed aria-disabled:opacity-45"
            onCheckedChange={(next) =>
              settle({ ...shown, automatically: next })
            }
          />
        </div>

        <span id="auto-run-most-cores" className={LABEL}>
          {MOST_CORES}
        </span>
        <div>
          <Select
            value={String(shown.mostCores)}
            onValueChange={(next) =>
              settle({ ...shown, mostCores: Number(next) })
            }
          >
            <SelectTrigger
              size="sm"
              aria-labelledby="auto-run-most-cores"
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
                  {!autoRun.stored &&
                    count === autoRun.mostCores &&
                    `(${THE_DEFAULT})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span className={LABEL}>{SUBJECT}</span>
        <span className="self-start pt-1 text-ui text-ink">
          {autoRun.subject
            .map(
              (one) =>
                shapeFor(
                  RECORDING_OUTCOME_TERMS,
                  one,
                  NOT_YET_IN_THIS_BUILD_TERM,
                ).label,
            )
            .join('・')}
        </span>
      </div>

      <p className="mt-3.5 font-code text-note tabular-nums text-ink-3">
        {autoRun.stored && autoRun.updatedAt
          ? `${autoRun.updatedAt} 更新`
          : STILL_AS_DEPLOYED}
      </p>

      {refusal && (
        <InlineAlert tone="warn" className="mt-3">
          {refusal}
        </InlineAlert>
      )}
    </Surface>
  )
}
