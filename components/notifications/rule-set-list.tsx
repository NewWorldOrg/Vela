'use client'

import { useState } from 'react'

import {
  type NotificationDestination,
  type NotificationRuleSet,
  type NotificationWrite,
  type RuleSetDraft,
} from '@/lib/notifications'
import { RuleSetDialog } from '@/components/notifications/rule-set-dialog'
import { RuleSetRow } from '@/components/notifications/rule-set-row'

export interface RuleSetActions {
  onAddRuleSet: (draft: RuleSetDraft) => Promise<NotificationWrite>
  onReviseRuleSet: (
    id: string,
    draft: RuleSetDraft,
  ) => Promise<NotificationWrite>
  onToggleRuleSet: (id: string, enabled: boolean) => Promise<NotificationWrite>
  onRemoveRuleSet: (id: string) => Promise<NotificationWrite>
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
              sendsTo={ruleSet.destinations.flatMap((id) => {
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
