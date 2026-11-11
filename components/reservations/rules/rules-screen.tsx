'use client'

import type { ReactNode } from 'react'
import { useCallback, useState, useTransition } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import { signedOut } from '@/lib/signed-out'
import {
  NEW_RULE,
  RULE_PARAM,
  ruleConditionParts,
  ruleApplicationFellShort,
  ruleApplicationPartsOf,
} from '@/lib/rules'
import { cn } from '@/lib/utils'
import type { GuideChannel } from '@/repository/programs'
import type {
  RuleApplication,
  RulesResult,
  RuleWrite,
} from '@/repository/rules'
import { Button } from '@/components/ui/button'
import { ActionRow } from '@/components/vela/action-row'
import { EmptyState } from '@/components/vela/empty-state'
import {
  PlusIcon,
  RebuildIcon,
  SearchIcon,
  SuccessIcon,
  WarningIcon,
} from '@/components/vela/icons'
import { ReservationTabs } from '@/components/reservations/reservation-tabs'
import { ScreenMain } from '@/components/vela/screen-main'
import type {
  RuleEditing,
  RuleActions,
} from '@/components/reservations/rules-view'
import { RuleRow } from '@/components/reservations/rules/rule-row'
import { RuleEditor } from '@/components/reservations/rules/rule-editor'
import { Count } from '@/components/reservations/rules/count'
import { Excluded } from '@/components/reservations/rules/excluded'

const NOTHING_TO_APPLY = '有効なルールがないため、適用できません。'

const LIST_PINNED =
  'min-[1000px]:sticky min-[1000px]:top-[calc(var(--top-bar)+16rem/16)] min-[1000px]:max-h-[calc(100svh-var(--top-bar)-56rem/16-env(safe-area-inset-bottom))] min-[1000px]:-mx-1.5 min-[1000px]:overflow-x-hidden min-[1000px]:overflow-y-auto min-[1000px]:px-1.5'

export function RulesScreen({
  result,
  channels,
  editing,
  actions,
  ahead,
}: {
  result: RulesResult
  channels: GuideChannel[]
  editing: RuleEditing
  actions: RuleActions
  ahead?: Readonly<Record<string, number>>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const open = useCallback(
    (rule: string | undefined) => {
      const href = rule ? `${pathname}?${RULE_PARAM}=${rule}` : pathname

      router.replace(href as Route, { scroll: false })
    },
    [router, pathname],
  )
  const enabled = result.items.filter((rule) => rule.enabled).length
  const channelNameOf = (id: string): string =>
    channels.find((channel) => channel.id === id)?.name || id
  const [applied, setApplied] = useState<RuleWrite<RuleApplication>>()
  const [applying, startApplying] = useTransition()
  const anEnabledRule = result.items.find((rule) => rule.enabled)
  const apply = (id: string) => {
    setApplied(undefined)
    startApplying(async () => setApplied(await actions.onApply(id)))
  }

  return (
    <ScreenMain className="px-3.5 pt-3.5 pb-16 phone:pt-1 min-[701px]:px-6 min-[1366px]:px-10">
      <ReservationTabs
        current="rules"
        count={
          <>
            <span className="font-code">{result.total}</span> 件 · 有効{' '}
            <span className="font-code">{enabled}</span>
          </>
        }
        action={
          <>
            <Button
              variant="tone"
              disabled={applying || !anEnabledRule}
              title={anEnabledRule ? undefined : NOTHING_TO_APPLY}
              onClick={() => anEnabledRule && apply(anEnabledRule.id)}
            >
              <RebuildIcon />
              ルールを即時適用
            </Button>
            <ActionRow>
              <Button variant="tone" asChild>
                <Link href="/search">
                  <SearchIcon />
                  検索から作成
                </Link>
              </Button>
              <Button onClick={() => open(NEW_RULE)}>
                <PlusIcon />
                ルールを追加
              </Button>
            </ActionRow>
          </>
        }
      />

      <div aria-live="polite">
        {applied && <RuleApplicationNotice outcome={applied} />}
      </div>

      <div className="mt-5 grid items-start gap-8 min-[1000px]:grid-cols-[calc(360rem/16)_minmax(0,1fr)] min-[1366px]:grid-cols-[calc(420rem/16)_minmax(0,1fr)]">
        <section
          aria-labelledby="rules-list"
          className={cn('min-w-0', LIST_PINNED)}
        >
          <h2 id="rules-list" className="sr-only">
            ルール
          </h2>
          {result.items.length === 0 ? (
            <EmptyState usher={null} title="まだルールがありません" />
          ) : (
            <ul>
              {result.items.map((rule) => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  selected={
                    editing.state === 'rule' && editing.rule.id === rule.id
                  }
                  summary={ruleConditionParts(rule.terms, channelNameOf).join(
                    ' · ',
                  )}
                  ahead={ahead?.[rule.id]}
                  onOpen={() => open(rule.id)}
                  onSwitch={(next) => actions.onSwitch(rule.id, next)}
                />
              ))}
            </ul>
          )}
        </section>

        {editing.state === 'none' ? (
          <EmptyState title="選択中のルールがありません" />
        ) : (
          <RuleEditor
            rule={editing.state === 'rule' ? editing.rule : undefined}
            terms={
              editing.state === 'rule' ? editing.rule.terms : editing.terms
            }
            channels={channels}
            actions={actions}
            onOpen={open}
            onClose={() => open(undefined)}
          />
        )}
      </div>
    </ScreenMain>
  )
}

function RuleApplicationNotice({
  outcome,
}: {
  outcome: RuleWrite<RuleApplication>
}) {
  if (outcome.state !== 'ok') {
    return (
      <AppliedLine fellShort>
        {outcome.state === 'unauthenticated'
          ? signedOut('適用')
          : outcome.message}
      </AppliedLine>
    )
  }

  return (
    <AppliedLine fellShort={ruleApplicationFellShort(outcome.data)}>
      <span className="block">
        ルールを適用しました(
        {ruleApplicationPartsOf(outcome.data).map((part, at) => (
          <span key={part.label}>
            {at > 0 && '、'}
            {part.label} <Count value={part.count} /> 件
          </span>
        ))}
        )。
      </span>
      <Excluded
        excluded={{ shadows: 0, moved: outcome.data.excludedAsMoved }}
        as="span"
      />
    </AppliedLine>
  )
}

function AppliedLine({
  fellShort,
  children,
}: {
  fellShort: boolean
  children: ReactNode
}) {
  const Icon = fellShort ? WarningIcon : SuccessIcon

  return (
    <div
      data-slot="rule-application"
      className={cn(
        'mt-4 flex items-start gap-2 rounded-lg px-4 py-3 text-sub leading-[1.7]',
        fellShort ? 'bg-warn-soft text-warn-text' : 'bg-surface text-ink',
      )}
    >
      <Icon className="mt-[calc(3rem/16)] size-[calc(15rem/16)] shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
