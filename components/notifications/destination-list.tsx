'use client'

import { useState, useTransition } from 'react'

import { cn } from '@/lib/utils'
import { signedOut } from '@/lib/signed-out'
import {
  goingToo,
  lastResultSaid,
  ruleSetsGoingWith,
  tailOf,
  testSaid,
  withWhy,
  type DestinationRevision,
  type NotificationDestination,
  type NotificationRuleSet,
  type NotificationWrite,
  type Said,
  type TestSending,
  type Verdict,
} from '@/lib/notifications'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/vela/progress'
import { StatusDot, type StatusTone } from '@/components/vela/status'
import { useToast } from '@/components/vela/toast'
import { EditDestinationDialog } from '@/components/notifications/edit-destination-dialog'
import { RemoveDialog } from '@/components/notifications/remove-button'
import { KindChip, RowMenu } from '@/components/notifications/row-menu'

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

/** The name and the last result on the left; the switch and the `…` on the right, beside the name on a phone. */
const ROW_AREAS = cn(
  'grid min-h-[calc(76rem/16)] grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 px-4 py-3',
  "[grid-template-areas:'head_sw_more'_'last_sw_more']",
  "upright:min-h-0 upright:gap-x-1 upright:px-3.5 upright:[grid-template-areas:'head_sw_more'_'last_last_last']",
)

const SIGNED_OUT = signedOut('操作')

function refusalOf(result: Exclude<NotificationWrite, { state: 'ok' }>) {
  return result.state === 'unauthenticated' ? SIGNED_OUT : result.message
}

export function DestinationList({
  destinations,
  ruleSets,
  actions,
  now,
}: {
  destinations: NotificationDestination[]
  ruleSets: Pick<NotificationRuleSet, 'name' | 'destinations'>[]
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
          goingWith={ruleSetsGoingWith(destination.id, ruleSets).map(
            ({ name }) => name,
          )}
          actions={actions}
          now={now}
        />
      ))}
    </ul>
  )
}

const TEST_SENT = 'テスト送信'

/** The line under the name: the answer to a test send while there is one, otherwise how the last notice went; on a phone the address's tail after it. */
function ResultLine({
  said,
  testing,
  tested,
  tail,
}: {
  said?: Said
  testing: boolean
  tested?: Said
  tail?: string
}) {
  const shown = tested ?? said
  const words = testing
    ? `${TEST_SENT} · 送信中`
    : tested && `${TEST_SENT} · ${withWhy(tested)}`

  if (!shown && !testing && !tail) {
    return null
  }

  return (
    <span
      aria-live="polite"
      className={cn(
        'mt-[calc(5rem/16)] flex min-w-0 items-center gap-1.5 text-sub tabular-nums [grid-area:last] upright:mt-1',
        testing && 'text-ink-2',
        !testing && tested && cn(TESTED_OF[tested.verdict], 'font-semibold'),
        !testing && !tested && LINE_OF[said?.verdict ?? 'calm'],
      )}
    >
      {testing && <Spinner size="control" />}
      {!testing && shown && (
        <StatusDot tone={DOT_OF[shown.verdict]} className="size-1.5" />
      )}
      {(words || said) && (
        <span className="truncate">{words || (said && withWhy(said))}</span>
      )}
      {tail && (
        <span className="hidden shrink-0 font-normal text-ink-2 upright:inline">
          {(words || said) && '· '}
          {tailOf(tail)}
        </span>
      )}
    </span>
  )
}

function DestinationRow({
  destination,
  goingWith,
  actions,
  now,
}: {
  destination: NotificationDestination
  /** The names of the rule sets that are removed when this destination is. */
  goingWith: string[]
  actions: DestinationActions
  now: number
}) {
  const [enabled, setEnabled] = useState(destination.enabled)
  const [tested, setTested] = useState<Said>()
  const [testing, startTesting] = useTransition()
  const [editing, setEditing] = useState(false)
  const [removing, setRemoving] = useState(false)
  const say = useToast()
  const { id, name, kind, tail } = destination
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
      <span className="flex min-w-0 items-center gap-2.5 pr-2 [grid-area:head] upright:gap-2 upright:pr-1">
        <span
          className={cn(
            'min-w-0 truncate text-title font-semibold tracking-[-0.008em]',
            enabled ? 'text-ink' : 'text-ink-2',
          )}
        >
          {name}
        </span>
        <KindChip kind={kind} className="shrink-0" />
        {tail && (
          <span className="shrink-0 text-[calc(13rem/16)] text-ink-2 tabular-nums upright:hidden">
            {tailOf(tail)}
          </span>
        )}
      </span>
      <ResultLine
        said={lastResultSaid(destination, now)}
        testing={testing}
        tested={tested}
        tail={tail}
      />
      <Switch
        checked={enabled}
        aria-label={`${name} を有効にする`}
        onCheckedChange={(next) => void toggle(next)}
        className="mr-1 [grid-area:sw] upright:mr-0.5"
      />
      <RowMenu
        name={name}
        className="[grid-area:more]"
        actions={[
          { label: TEST_SENT, onSelect: test },
          ...(webhook
            ? [{ label: '変更', onSelect: () => setEditing(true) }]
            : []),
        ]}
        onRemove={() => setRemoving(true)}
      />
      {webhook && (
        <EditDestinationDialog
          destination={destination}
          open={editing}
          onOpenChange={setEditing}
          onRevise={actions.onReviseDestination}
        />
      )}
      <RemoveDialog
        what="送り先"
        name={name}
        also={goingToo(goingWith)}
        open={removing}
        onOpenChange={setRemoving}
        onRemove={() => actions.onRemoveDestination(id)}
      />
    </li>
  )
}
