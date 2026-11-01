'use client'

import { useOptimistic, useState, useTransition } from 'react'

import { EMPTY_VALUE } from '@/lib/empty-value'
import { NOT_YET_IN_THIS_BUILD, shapeFor } from '@/lib/not-yet-in-this-build'
import {
  NOT_YET_IN_THIS_BUILD_TERM,
  RECORDING_OUTCOME_TERMS,
} from '@/lib/state-terms'
import { signedOut } from '@/lib/signed-out'
import type { EncodeAutoRun, EncodeWrite } from '@/repository/encode'
import { FEWEST_CORES, NOWHERE_SETTLED_TERMS } from '@/repository/encode-terms'
import { StateSay } from '@/components/recordings/status-cell'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { InlineAlert } from '@/components/vela/banner'
import { SettingsGroup } from '@/components/vela/settings-rows'
import { TermTip } from '@/components/vela/term-tip'

const SIGNED_OUT = signedOut('保存')

const RUNS_ITSELF = '自動実行'

const MOST_CORES = '使用コア数の上限'

const SUBJECT = '対象'

const DESTINATION = '保存先'

const STILL_AS_DEPLOYED = '既定のまま'

const THE_DEFAULT = '既定'

const RUNS_ITSELF_ID = 'auto-run-runs-itself'

const MOST_CORES_ID = 'auto-run-most-cores'

const ROW =
  'flex min-h-14 items-center gap-4 border-b border-hair px-4 py-2 last:border-b-0'

const NAME =
  'min-w-0 flex-1 text-[calc(14.5rem/16)] leading-5 font-medium text-ink'

const VALUE = 'min-w-0 text-right text-body text-ink-2'

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

function WhereArtefactsGoSay({
  where,
  destination,
}: {
  where: EncodeAutoRun['whereArtefactsGo']
  destination?: string
}) {
  if (where === 'settled') {
    return destination ?? EMPTY_VALUE
  }

  const term = shapeFor(NOWHERE_SETTLED_TERMS, where, undefined)

  if (term === undefined) {
    return NOT_YET_IN_THIS_BUILD
  }

  return (
    <TermTip term={term}>
      <StateSay tone="warn" bold>
        {term.label}
      </StateSay>
    </TermTip>
  )
}

export function AutoRunPanel({
  autoRun,
  destination,
  onSettle,
}: {
  autoRun: EncodeAutoRun
  destination?: string
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
    <div data-slot="auto-run" className="max-w-[calc(720rem/16)]">
      <SettingsGroup>
        <dl>
          <div className={ROW}>
            <dt className={NAME}>
              <label htmlFor={RUNS_ITSELF_ID}>{RUNS_ITSELF}</label>
            </dt>
            <dd>
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
          </div>

          <div className={ROW}>
            <dt className={NAME}>
              <label htmlFor={MOST_CORES_ID}>{MOST_CORES}</label>
            </dt>
            <dd className="flex items-center gap-3">
              {!autoRun.stored && (
                <span
                  data-slot="field-hint"
                  className="text-sub tabular-nums text-ink-2"
                >
                  {THE_DEFAULT} {autoRun.mostCores}
                </span>
              )}
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
                  className="w-fit min-w-[calc(96rem/16)] tabular-nums"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cores.map((count) => (
                    <SelectItem
                      key={count}
                      value={String(count)}
                      className="tabular-nums"
                    >
                      {count}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </dd>
          </div>

          <div className={ROW}>
            <dt className={NAME}>{SUBJECT}</dt>
            <dd className={VALUE}>{subjectSaying(autoRun.subject)}</dd>
          </div>

          <div className={ROW}>
            <dt className={NAME}>{DESTINATION}</dt>
            <dd className={VALUE} data-slot="where-artefacts-go">
              <WhereArtefactsGoSay
                where={autoRun.whereArtefactsGo}
                destination={destination}
              />
            </dd>
          </div>
        </dl>
      </SettingsGroup>

      <p className="mx-4 mt-2 text-note tabular-nums text-ink-2">
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
    </div>
  )
}
