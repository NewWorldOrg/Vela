'use client'

import { memo } from 'react'

import type { ServiceRow } from '@/repository/services'
import { AbleSay } from '@/components/recordings/able-say'
import { StateSay } from '@/components/recordings/state-say'
import { StatusCell } from '@/components/recordings/status-cell'
import { TableCell, TableRow } from '@/components/ui/table'
import { cardPlace } from '@/components/ui/table-cards'
import { ChevronRightIcon } from '@/components/vela/icons'
import { ChannelMark } from '@/components/vela/channel-mark'
import { ServiceId } from '@/components/channels/service-id'
import { TermTip } from '@/components/vela/term-tip'
import { SERVICE_NO_TUNER_TERM } from '@/lib/state-terms'
import { cn } from '@/lib/utils'

function Category({ service }: { service: ServiceRow }) {
  return <span className="text-ui text-ink-2">{service.category}</span>
}

const NEEDS_A_LOOK = '要対応'

const A_BETTER_ONE = '実測上位の候補'

function hasStanding(service: ServiceRow): boolean {
  return (
    service.unreceivable ||
    service.currentChannel === undefined ||
    service.betterChannel !== undefined
  )
}

function Standing({ service }: { service: ServiceRow }) {
  if (service.unreceivable) {
    return (
      <TermTip term={SERVICE_NO_TUNER_TERM}>
        <StateSay tone="err" bold>
          {SERVICE_NO_TUNER_TERM.label}
        </StateSay>
      </TermTip>
    )
  }

  if (service.currentChannel === undefined) {
    return (
      <StateSay tone="warn" bold>
        {NEEDS_A_LOOK}
      </StateSay>
    )
  }

  if (service.betterChannel === undefined) {
    return null
  }

  return (
    <span className="text-ui text-ink">
      {A_BETTER_ONE} {service.betterChannel}
    </span>
  )
}

export const ServiceLine = memo(function ServiceLine({
  service,
  expanded,
  onToggle,
}: {
  service: ServiceRow
  expanded: boolean
  onToggle: (serviceKey: string) => void
}) {
  return (
    <TableRow className="has-aria-expanded:bg-transparent">
      <TableCell {...cardPlace('end')} className="w-6">
        <button
          type="button"
          aria-label={`${service.name} の候補チャンネル`}
          aria-expanded={expanded}
          onClick={() => onToggle(service.key)}
          className="tap-target inline-flex cursor-pointer text-ink-2 hover:text-ink"
        >
          <ChevronRightIcon
            className={cn(
              'size-3.5 transition-transform duration-150 ease-toy still:transition-none',
              expanded && 'rotate-90',
            )}
          />
        </button>
      </TableCell>
      <TableCell {...cardPlace('lead')}>
        <span className="flex min-w-0 items-center gap-2">
          <ChannelMark logo={service.logo} no={service.no} keepsTheSlot />
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <b className="min-w-0 text-[calc(13rem/16)] font-bold">
              {service.name}
            </b>
            <ServiceId sid={service.sid} />
          </span>
        </span>
      </TableCell>
      <TableCell {...cardPlace('field', '区分')}>
        <Category service={service} />
      </TableCell>
      <TableCell {...cardPlace('field', '現在の物理ch')}>
        {service.currentChannel === undefined ? (
          <span className="text-ui font-bold text-warn-text">選局先なし</span>
        ) : (
          <span className="font-code font-medium tabular-nums">
            {service.currentChannel}
          </span>
        )}
      </TableCell>
      <TableCell {...cardPlace('field', '候補')}>
        <span className="font-code tabular-nums text-ink-2">
          {service.candidateCount}
        </span>
        {service.needsAttentionCount > 0 && (
          <span className="ml-1.5 text-sub text-warn-text">
            (要確認 {service.needsAttentionCount})
          </span>
        )}
      </TableCell>
      <TableCell {...cardPlace('meta')}>
        <AbleSay able={service.enabled} />
      </TableCell>
      <TableCell
        {...cardPlace('meta')}
        className="font-code text-sub whitespace-nowrap text-ink-2"
      >
        {service.lastSeen}
      </TableCell>
      <TableCell
        {...cardPlace('field', hasStanding(service) ? '状態' : undefined)}
      >
        <StatusCell>
          <Standing service={service} />
        </StatusCell>
      </TableCell>
    </TableRow>
  )
})
