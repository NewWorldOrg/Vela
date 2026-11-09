'use client'

import { useState, useTransition } from 'react'

import { cn } from '@/lib/utils'
import { signedOut } from '@/lib/signed-out'
import {
  KIND_LABEL,
  lastResultSaid,
  tailOf,
  testSaid,
  withWhy,
  type NotificationDestination,
  type NotificationWrite,
  type Said,
  type TestSending,
  type Verdict,
} from '@/lib/notifications'
import { wordFor } from '@/lib/not-yet-in-this-build'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/vela/progress'
import { StatusDot, type StatusTone } from '@/components/vela/status'
import { useToast } from '@/components/vela/toast'
import {
  EditDestinationButton,
  type DestinationRevision,
} from '@/components/notifications/edit-destination-dialog'
import { RemoveButton } from '@/components/notifications/remove-button'

export interface DestinationActions {
  onToggleDestination: (
    id: string,
    enabled: boolean,
  ) => Promise<NotificationWrite>
  onTestDestination: (id: string) => Promise<TestSending>
  onReviseDestination: (
    id: string,
    revision: DestinationRevision,
  ) => Promise<NotificationWrite>
  onRemoveDestination: (id: string) => Promise<NotificationWrite>
}

export const DOT_OF: Record<Verdict, StatusTone> = {
  ok: 'ok',
  warn: 'warn',
  err: 'err',
  calm: 'off',
}

const LINE_OF: Record<Verdict, string> = {
  ok: 'text-ink-2',
  warn: 'text-warn-text',
  err: 'text-rec-text',
  calm: 'text-ink-2',
}

const TESTED_OF: Record<Verdict, string> = {
  ok: 'text-acc-text',
  warn: 'text-warn-text',
  err: 'text-rec-text',
  calm: 'text-ink-2',
}

/** A row of a group, parted from the one above by a hair that starts where its words do. */
export const GROUP_ROW =
  'relative before:absolute before:top-0 before:right-0 before:left-4 before:h-px before:bg-hair first:before:hidden upright:before:left-3.5'

/** On a wide window the switch, the answer to a test and the buttons stand to the right of the name; on a phone the switch stays beside the name and the buttons go under it. */
const ROW_AREAS = cn(
  'grid min-h-[calc(76rem/16)] grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-x-2 px-4 py-3',
  "[grid-template-areas:'head_sw_res_acts'_'last_sw_res_acts']",
  "upright:grid-cols-[minmax(0,1fr)_auto] upright:px-3.5 upright:[grid-template-areas:'head_sw'_'last_last'_'acts_acts'_'res_res']",
)

const FLAT_ON_A_PHONE = 'upright:shadow-none'

const SIGNED_OUT = signedOut('操作')

function refusalOf(result: Exclude<NotificationWrite, { state: 'ok' }>) {
  return result.state === 'unauthenticated' ? SIGNED_OUT : result.message
}

export function DestinationList({
  destinations,
  actions,
  now,
}: {
  destinations: NotificationDestination[]
  actions: DestinationActions
  now: number
}) {
  return (
    <ul
      aria-label="送り先"
      className="overflow-hidden rounded-lg bg-surface [&_[data-slot=switch][data-state=unchecked]]:bg-[color-mix(in_srgb,var(--ink)_17%,var(--surface))]"
    >
      {destinations.map((destination) => (
        <DestinationRow
          key={`${destination.id}:${destination.enabled}`}
          destination={destination}
          actions={actions}
          now={now}
        />
      ))}
    </ul>
  )
}

function ResultLine({ said, tail }: { said?: Said; tail?: string }) {
  if (!said && !tail) {
    return null
  }

  return (
    <span
      className={cn(
        'mt-[calc(5rem/16)] flex min-w-0 items-center gap-1.5 text-sub tabular-nums [grid-area:last] upright:mt-1',
        LINE_OF[said?.verdict ?? 'calm'],
      )}
    >
      {said && (
        <>
          <StatusDot tone={DOT_OF[said.verdict]} className="size-1.5" />
          <span className="truncate">{withWhy(said)}</span>
        </>
      )}
      {tail && (
        <span className="hidden shrink-0 text-ink-2 upright:inline">
          {said && '· '}
          {tailOf(tail)}
        </span>
      )}
    </span>
  )
}

function DestinationRow({
  destination,
  actions,
  now,
}: {
  destination: NotificationDestination
  actions: DestinationActions
  now: number
}) {
  const [enabled, setEnabled] = useState(destination.enabled)
  const [tested, setTested] = useState<Said>()
  const [testing, startTesting] = useTransition()
  const say = useToast()
  const { id, name, kind, urlTail, lastResult } = destination
  const webhook = kind !== 'webPush'

  const toggle = async (next: boolean) => {
    setEnabled(next)

    const result = await actions.onToggleDestination(id, next)

    if (result.state !== 'ok') {
      setEnabled(!next)
      say({ text: refusalOf(result) })
    }
  }

  const test = () =>
    startTesting(async () => {
      setTested(undefined)

      const result = await actions.onTestDestination(id)

      if (result.state === 'ok') {
        setTested(testSaid(result))

        return
      }

      say({ text: refusalOf(result) })
    })

  return (
    <li data-destination={id} className={cn(GROUP_ROW, ROW_AREAS)}>
      <span className="flex min-w-0 items-center gap-2.5 pr-2 [grid-area:head] upright:gap-2 upright:pr-0">
        <span
          className={cn(
            'min-w-0 truncate text-title font-semibold tracking-[-0.008em]',
            enabled ? 'text-ink' : 'text-ink-2',
          )}
        >
          {name}
        </span>
        <Badge variant="info" className="shrink-0">
          {wordFor(KIND_LABEL, kind)}
        </Badge>
        {urlTail && (
          <span className="shrink-0 text-[calc(13rem/16)] text-ink-2 tabular-nums upright:hidden">
            {tailOf(urlTail)}
          </span>
        )}
      </span>
      <ResultLine
        said={lastResult && lastResultSaid(lastResult, now)}
        tail={urlTail}
      />
      <Switch
        checked={enabled}
        aria-label={`${name} を有効にする`}
        onCheckedChange={(next) => void toggle(next)}
        className="mr-2.5 [grid-area:sw] upright:mr-0"
      />
      <span
        aria-live="polite"
        className={cn(
          'text-sub font-semibold whitespace-nowrap tabular-nums [grid-area:res] upright:whitespace-normal',
          tested && cn(TESTED_OF[tested.verdict], 'upright:mt-2'),
        )}
      >
        {tested && withWhy(tested)}
      </span>
      <span className="flex items-center gap-2 [grid-area:acts] upright:mt-2.5 upright:flex-wrap">
        <Button
          variant="tone"
          size="sm"
          aria-label={`${name} にテスト送信`}
          disabled={testing}
          onClick={test}
          className={FLAT_ON_A_PHONE}
        >
          {testing && <Spinner size="control" />}
          テスト送信
        </Button>
        {webhook && (
          <EditDestinationButton
            destination={destination}
            onRevise={actions.onReviseDestination}
            className={FLAT_ON_A_PHONE}
          />
        )}
        <RemoveButton
          what="送り先"
          name={name}
          onRemove={() => actions.onRemoveDestination(id)}
          className={FLAT_ON_A_PHONE}
        />
      </span>
    </li>
  )
}
