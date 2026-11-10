'use client'

import { useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { signedOut } from '@/lib/signed-out'
import {
  deliveriesShown,
  narrowedTo,
  type LeadMinutes,
  type NotificationsScreen,
  type NotificationWrite,
  type WebhookDraft,
} from '@/lib/notifications'
import { Banner } from '@/components/vela/banner'
import { PageHeading } from '@/components/vela/section-heading'
import { SettingsGroup } from '@/components/vela/settings-rows'
import { useToast } from '@/components/vela/toast'
import {
  AddDestinationDialog,
  type BrowserChoice,
} from '@/components/notifications/add-destination-dialog'
import {
  DeliveryFilter,
  DeliveryLog,
} from '@/components/notifications/delivery-log'
import {
  DestinationList,
  type DestinationActions,
} from '@/components/notifications/destination-list'
import { LeadChoice } from '@/components/notifications/lead-choice'
import {
  AddRuleSetButton,
  RuleSetList,
  type RuleSetActions,
} from '@/components/notifications/rule-set-list'

export interface NotificationActions
  extends DestinationActions, RuleSetActions {
  onAddWebhook: (draft: WebhookDraft) => Promise<NotificationWrite>
  onSettleLead: (lead: LeadMinutes) => Promise<NotificationWrite>
}

export const NO_PUBLIC_ORIGIN =
  'リンクを載せるには公開のアドレスの設定が要ります'

const LEAD_NAME = '単発の通知の既定'

const SIGNED_OUT = signedOut('変更')

function GroupTitle({ end, children }: { end?: ReactNode; children: string }) {
  return (
    <div className="mt-[calc(22rem/16)] mb-2 flex min-h-[calc(34rem/16)] items-center gap-3 pl-4">
      <h2 className="text-sub font-semibold text-ink-2">{children}</h2>
      {end && <div className="ml-auto flex items-center gap-2">{end}</div>}
    </div>
  )
}

function Nothing({ children }: { children: string }) {
  return (
    <SettingsGroup>
      <p className="flex min-h-14 items-center px-4 text-body text-ink-2">
        {children}
      </p>
    </SettingsGroup>
  )
}

/** Settings > notifications: where notices go, which events go where, how early a programme's start is told, and what was sent lately. */
export function NotificationsView({
  screen,
  actions,
  browser,
  now,
}: {
  screen: NotificationsScreen
  actions: NotificationActions
  /** This browser as a destination, where it can be one. */
  browser?: BrowserChoice
  /** The present held still, for a picture. */
  now?: number
}) {
  const { settings, destinations, ruleSets } = screen
  const [lead, setLead] = useState(settings.notifyLeadMinutes)
  const [addingRuleSet, setAddingRuleSet] = useState(false)
  const [chosen, setChosen] = useState<string>()
  const logFor = narrowedTo(destinations, chosen)
  const deliveries = deliveriesShown(screen.deliveries, logFor)
  const say = useToast()

  const settleLead = async (next: LeadMinutes) => {
    const was = lead

    setLead(next)

    const result = await actions.onSettleLead(next)

    if (result.state !== 'ok') {
      setLead(was)
      say({
        text: result.state === 'unauthenticated' ? SIGNED_OUT : result.message,
      })
    }
  }

  return (
    <>
      <PageHeading>通知</PageHeading>

      {!settings.publicOriginKnown && (
        <Banner className="mt-[calc(18rem/16)] items-center py-3">
          {NO_PUBLIC_ORIGIN}
        </Banner>
      )}

      <section>
        <GroupTitle
          end={
            <AddDestinationDialog
              browser={browser}
              onAddWebhook={actions.onAddWebhook}
            />
          }
        >
          送り先
        </GroupTitle>
        {destinations.length > 0 ? (
          <DestinationList
            destinations={destinations}
            ruleSets={ruleSets}
            actions={actions}
            now={now}
          />
        ) : (
          <Nothing>送り先がありません</Nothing>
        )}
      </section>

      <section>
        <GroupTitle
          end={
            <AddRuleSetButton
              count={ruleSets.length}
              destinations={destinations.length}
              onPress={() => setAddingRuleSet(true)}
            />
          }
        >
          ルールセット
        </GroupTitle>
        {ruleSets.length === 0 && <Nothing>ルールセットがありません</Nothing>}
        <RuleSetList
          ruleSets={ruleSets}
          destinations={destinations}
          actions={actions}
          adding={addingRuleSet}
          onAddingChange={setAddingRuleSet}
        />
      </section>

      <section>
        <GroupTitle>単発の通知</GroupTitle>
        <SettingsGroup>
          <div className="flex min-h-14 items-center gap-4 px-4 py-2 upright:flex-col upright:items-stretch upright:gap-2.5 upright:px-3.5 upright:pt-3 upright:pb-3.5">
            <span className="min-w-0 flex-1 text-[calc(14.5rem/16)] leading-5 font-medium text-ink">
              {LEAD_NAME}
            </span>
            <LeadChoice
              aria-label={LEAD_NAME}
              value={lead}
              onValueChange={(next) => void settleLead(next)}
              className={cn(
                'bg-bg',
                'upright:grid upright:grid-cols-5 upright:[&>button]:justify-center upright:[&>button]:px-0 upright:[&>button]:text-sub',
              )}
            />
          </div>
        </SettingsGroup>
      </section>

      <section>
        <GroupTitle
          end={
            destinations.length > 0 && (
              <DeliveryFilter
                destinations={destinations}
                value={logFor}
                onChange={setChosen}
              />
            )
          }
        >
          直近の配送
        </GroupTitle>
        {deliveries.length > 0 ? (
          <DeliveryLog
            deliveries={deliveries}
            destinations={destinations}
            now={now}
          />
        ) : (
          <Nothing>配送の記録はありません</Nothing>
        )}
      </section>
    </>
  )
}
