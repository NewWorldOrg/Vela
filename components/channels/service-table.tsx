'use client'

import { createContext, use, type ReactNode } from 'react'

import type {
  CandidateTuning,
  ServiceRow,
  WriteResult,
} from '@/repository/services'
import {
  AbleSay,
  StateSay,
  StatusCell,
} from '@/components/recordings/status-cell'
import {
  Table,
  TableBody,
  TableColumns,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ADMIN_LIST_HEIGHT_CAP } from '@/components/vela/app-shell'
import { ChevronRightIcon } from '@/components/vela/icons'
import { ChannelMark } from '@/components/vela/channel-mark'
import { Unfold, useUnfolding, type Unfolding } from '@/components/vela/unfold'
import { CandidateList } from '@/components/channels/candidate-list'
import { cn } from '@/lib/utils'
import { WHEN_LABELS } from '@/lib/when-terms'

const SERVICE_COLUMNS: {
  label: string
  width: string
  hidden?: boolean
}[] = [
  { label: '候補チャンネルの開閉', width: 'calc(34rem/16)', hidden: true },
  { label: 'サービス', width: 'calc(300rem/16)' },
  { label: '区分', width: 'calc(84rem/16)' },
  { label: '現在の物理ch', width: 'calc(124rem/16)' },
  { label: '候補', width: 'calc(124rem/16)' },
  { label: '有効', width: 'calc(92rem/16)' },
  { label: WHEN_LABELS.taken, width: 'calc(122rem/16)' },
  { label: '状態', width: 'calc(200rem/16)', hidden: true },
]

export interface CandidateActions {
  onSelect: (
    serviceKey: string,
    candidateChannelId: string,
  ) => Promise<WriteResult>
  onAdd: (serviceKey: string, tuning: CandidateTuning) => Promise<WriteResult>
  onDelete: (
    serviceKey: string,
    candidateChannelId: string,
  ) => Promise<WriteResult>
}

const UnfoldedService = createContext<Unfolding | null>(null)

export function UnfoldingServices({ children }: { children: ReactNode }) {
  return <UnfoldedService value={useUnfolding()}>{children}</UnfoldedService>
}

function useUnfolded(): Unfolding {
  const held = use(UnfoldedService)

  if (held === null) {
    throw new Error(
      'A service table unfolds through the provider above it, and there is none.',
    )
  }

  return held
}

function Category({ service }: { service: ServiceRow }) {
  return <span className="text-ui text-ink-2">{service.category}</span>
}

const NEEDS_A_LOOK = '要対応'

const A_BETTER_ONE = '実測上位の候補'

function Standing({ service }: { service: ServiceRow }) {
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
    <span className="text-ui text-sky">
      {A_BETTER_ONE} {service.betterChannel}
    </span>
  )
}

function UnfoldedCandidates({
  service,
  actions,
  expanded,
  onSettle,
}: {
  service: ServiceRow
  actions: CandidateActions
  expanded: boolean
  onSettle: (serviceKey: string) => void
}) {
  return (
    <TableRow className="[&:last-child_[data-slot=unfold-body]]:border-b-0">
      <TableCell colSpan={SERVICE_COLUMNS.length} className="border-0 p-0">
        <Unfold
          open={expanded}
          onSettle={() => onSettle(service.key)}
          bodyClassName="border-b border-dashed border-line bg-surface-2 py-3.5 pr-[calc(18rem/16)] pl-10"
        >
          <CandidateList
            serviceKey={service.key}
            serviceName={service.name}
            candidates={service.candidates}
            {...actions}
          />
        </Unfold>
      </TableCell>
    </TableRow>
  )
}

export function ServiceTable({
  services,
  actions,
}: {
  services: ServiceRow[]
  actions: CandidateActions
}) {
  const { open, folding, toggle, settle } = useUnfolded()

  return (
    <Table
      className="table-fixed min-w-[calc(860rem/16)]"
      containerClassName={cn(ADMIN_LIST_HEIGHT_CAP, 'overflow-y-auto pb-1')}
    >
      <TableColumns widths={SERVICE_COLUMNS.map((column) => column.width)} />
      <TableHeader className="[&>tr>th]:sticky [&>tr>th]:top-0 [&>tr>th]:z-10">
        <TableRow>
          {SERVICE_COLUMNS.map((column) => (
            <TableHead key={column.label}>
              {column.hidden ? (
                <span className="sr-only">{column.label}</span>
              ) : (
                column.label
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {services.map((service) => {
          const expanded = open === service.key
          const mounted = expanded || folding === service.key

          return [
            <TableRow
              key={service.key}
              className="has-aria-expanded:bg-transparent"
            >
              <TableCell className="w-6">
                <button
                  type="button"
                  aria-label={`${service.name} の候補チャンネル`}
                  aria-expanded={expanded}
                  onClick={() => toggle(service.key)}
                  className="tap-target inline-flex cursor-pointer text-ink-3 hover:text-ink"
                >
                  <ChevronRightIcon
                    className={cn(
                      'size-3.5 transition-transform duration-150 ease-toy motion-reduce:transition-none',
                      expanded && 'rotate-90',
                    )}
                  />
                </button>
              </TableCell>
              <TableCell>
                <span className="flex min-w-0 items-center gap-2">
                  <ChannelMark
                    logo={service.logo}
                    no={service.no}
                    keepsTheSlot
                  />
                  <b className="min-w-0 text-[calc(13rem/16)] font-bold">
                    {service.name}
                  </b>
                </span>
              </TableCell>
              <TableCell>
                <Category service={service} />
              </TableCell>
              <TableCell>
                {service.currentChannel === undefined ? (
                  <span className="text-ui font-bold text-lemon">
                    選局先なし
                  </span>
                ) : (
                  <span className="font-code font-medium tabular-nums">
                    {service.currentChannel}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <span className="font-code tabular-nums text-ink-2">
                  {service.candidateCount}
                </span>
                {service.needsAttentionCount > 0 && (
                  <span className="ml-1.5 text-sub text-lemon">
                    (要確認 {service.needsAttentionCount})
                  </span>
                )}
              </TableCell>
              <TableCell>
                <AbleSay able={service.enabled} />
              </TableCell>
              <TableCell className="font-code text-sub whitespace-nowrap text-ink-2">
                {service.lastSeen}
              </TableCell>
              <TableCell>
                <StatusCell>
                  <Standing service={service} />
                </StatusCell>
              </TableCell>
            </TableRow>,
            mounted && (
              <UnfoldedCandidates
                key={`${service.key}-candidates`}
                service={service}
                actions={actions}
                expanded={expanded}
                onSettle={settle}
              />
            ),
          ]
        })}
      </TableBody>
    </Table>
  )
}
