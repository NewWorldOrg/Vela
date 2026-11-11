'use client'

import {
  ruleSetsGoingWith,
  type DestinationRevision,
  type NotificationDestination,
  type NotificationRuleSet,
  type NotificationWrite,
  type TestSending,
} from '@/lib/notifications'
import { DestinationRow } from '@/components/notifications/destination-row'

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

export function DestinationList({
  destinations,
  ruleSets,
  actions,
  now,
}: {
  destinations: NotificationDestination[]
  ruleSets: Pick<NotificationRuleSet, 'name' | 'destinations'>[]
  actions: DestinationActions
  now?: number
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
