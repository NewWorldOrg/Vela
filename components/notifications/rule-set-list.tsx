'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'
import { signedOut } from '@/lib/signed-out'
import {
  eventsSummary,
  ruleSetsFull,
  type NotificationDestination,
  type NotificationRuleSet,
  type NotificationWrite,
  type RuleSetDraft,
} from '@/lib/notifications'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { PlusIcon } from '@/components/vela/icons'
import { pressable } from '@/components/vela/tactile'
import { useToast } from '@/components/vela/toast'
import { GROUP_ROW } from '@/components/notifications/destination-list'
import { RemoveButton } from '@/components/notifications/remove-button'
import { RuleSetDialog } from '@/components/notifications/rule-set-dialog'

export interface RuleSetActions {
  onAddRuleSet: (draft: RuleSetDraft) => Promise<NotificationWrite>
  onReviseRuleSet: (
    id: string,
    draft: RuleSetDraft,
  ) => Promise<NotificationWrite>
  onToggleRuleSet: (id: string, enabled: boolean) => Promise<NotificationWrite>
  onRemoveRuleSet: (id: string) => Promise<NotificationWrite>
}

const SIGNED_OUT = signedOut('操作')

/** On a wide window the switch and the buttons stand to the right; on a phone the switch stays beside the name and the row itself opens the editor. */
const ROW_AREAS = cn(
  'grid min-h-[calc(76rem/16)] grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 px-4 py-3',
  "[grid-template-areas:'info_sw_acts']",
  "upright:grid-cols-[minmax(0,1fr)_auto] upright:items-start upright:px-3.5 upright:[grid-template-areas:'info_sw']",
)

/** `追加` over the rule sets, which stops at twenty, and before there is anywhere to send to. */
export function AddRuleSetButton({
  count,
  destinations,
  onPress,
}: {
  count: number
  destinations: number
  onPress: () => void
}) {
  return (
    <Button
      size="sm"
      disabled={ruleSetsFull(count) || destinations === 0}
      onClick={onPress}
    >
      <PlusIcon />
      追加
    </Button>
  )
}

export function RuleSetList({
  ruleSets,
  destinations,
  actions,
  adding,
  onAddingChange,
}: {
  ruleSets: NotificationRuleSet[]
  destinations: Pick<NotificationDestination, 'id' | 'name'>[]
  actions: RuleSetActions
  adding: boolean
  onAddingChange: (adding: boolean) => void
}) {
  const [editing, setEditing] = useState<string>()
  const chosen = ruleSets.find(({ id }) => id === editing)
  const nameOf = new Map(destinations.map(({ id, name }) => [id, name]))

  return (
    <>
      {ruleSets.length > 0 && (
        <ul
          aria-label="ルールセット"
          className="overflow-hidden rounded-lg bg-surface [&_[data-slot=switch][data-state=unchecked]]:bg-[color-mix(in_srgb,var(--ink)_17%,var(--surface))]"
        >
          {ruleSets.map((ruleSet) => (
            <RuleSetRow
              key={`${ruleSet.id}:${ruleSet.enabled}`}
              ruleSet={ruleSet}
              sendsTo={ruleSet.destinationIds.flatMap((id) => {
                const name = nameOf.get(id)

                return name === undefined ? [] : [name]
              })}
              onOpen={() => setEditing(ruleSet.id)}
              actions={actions}
            />
          ))}
        </ul>
      )}

      <RuleSetDialog
        key={chosen?.id ?? 'new'}
        ruleSet={chosen}
        destinations={destinations}
        open={chosen !== undefined || adding}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(undefined)
            onAddingChange(false)
          }
        }}
        onSave={(draft) =>
          chosen
            ? actions.onReviseRuleSet(chosen.id, draft)
            : actions.onAddRuleSet(draft)
        }
        onRemove={chosen && (() => actions.onRemoveRuleSet(chosen.id))}
      />
    </>
  )
}

function RuleSetRow({
  ruleSet,
  sendsTo,
  onOpen,
  actions,
}: {
  ruleSet: NotificationRuleSet
  sendsTo: string[]
  onOpen: () => void
  actions: RuleSetActions
}) {
  const [enabled, setEnabled] = useState(ruleSet.enabled)
  const say = useToast()
  const { id, name } = ruleSet

  const toggle = async (next: boolean) => {
    setEnabled(next)

    const result = await actions.onToggleRuleSet(id, next)

    if (result.state !== 'ok') {
      setEnabled(!next)
      say({
        text: result.state === 'unauthenticated' ? SIGNED_OUT : result.message,
      })
    }
  }

  return (
    <li data-rule-set={id} className={cn(GROUP_ROW, ROW_AREAS)}>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'min-w-0 rounded-sm pr-2 text-left outline-none [grid-area:info] focus-visible:shadow-ring upright:pr-0',
          pressable,
        )}
      >
        <span
          className={cn(
            'block truncate text-title font-semibold tracking-[-0.008em]',
            enabled ? 'text-ink' : 'text-ink-2',
          )}
        >
          {name}
        </span>
        <span className="mt-[calc(5rem/16)] flex min-w-0 flex-wrap items-center gap-1.5 text-sub text-ink-2 upright:mt-1">
          <span className="min-w-0 truncate upright:basis-full">
            {eventsSummary(ruleSet.events)}
          </span>
          <span aria-hidden="true" className="mx-0.5 text-ink-3 upright:hidden">
            →
          </span>
          {sendsTo.map((destination) => (
            <Badge
              key={destination}
              variant="info"
              className="h-[calc(22rem/16)] px-2 text-cap upright:mt-0.5"
            >
              {destination}
            </Badge>
          ))}
        </span>
      </button>
      <Switch
        checked={enabled}
        aria-label={`${name} を有効にする`}
        onCheckedChange={(next) => void toggle(next)}
        className="mr-2.5 [grid-area:sw] upright:mr-0"
      />
      <span className="flex items-center gap-2 [grid-area:acts] upright:hidden">
        <Button
          variant="tone"
          size="sm"
          aria-label={`${name} を変更`}
          onClick={onOpen}
        >
          変更
        </Button>
        <RemoveButton
          what="ルールセット"
          name={name}
          onRemove={() => actions.onRemoveRuleSet(id)}
        />
      </span>
    </li>
  )
}
