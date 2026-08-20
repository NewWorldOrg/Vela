'use client'

import { createContext, use, useState, type ReactNode } from 'react'

import type {
  CandidateTuning,
  ServiceRow,
  WriteResult,
} from '@/repository/services'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronDownIcon, ChevronRightIcon } from '@/components/vela/icons'
import { CandidateList } from '@/components/channels/candidate-list'

/**
 * The first and last headings carry no visible text in the design — the caret
 * and the attention chip speak for themselves — so they are named for screen
 * readers only.
 */
const SERVICE_COLUMNS: { label: string; hidden?: boolean }[] = [
  { label: '候補チャンネルの開閉', hidden: true },
  { label: 'サービス' },
  { label: '区分' },
  { label: '現在の物理ch' },
  { label: '候補' },
  { label: '有効' },
  { label: '最終確認' },
  { label: '状態', hidden: true },
]

/** The writes a candidate row offers, carried down to every service table. */
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

interface Unfolded {
  /** The service whose candidates are unfolded, at most one for the page. */
  open?: string
  toggle: (serviceKey: string) => void
}

const UnfoldedService = createContext<Unfolded | null>(null)

/**
 * Which service has its candidates unfolded. The candidates are already in the
 * payload the list was drawn from, so unfolding one asks the server for
 * nothing and is held here rather than in the URL.
 */
export function UnfoldingServices({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<string>()

  return (
    <UnfoldedService
      value={{
        open,
        toggle: (serviceKey) =>
          setOpen((held) => (held === serviceKey ? undefined : serviceKey)),
      }}
    >
      {children}
    </UnfoldedService>
  )
}

function useUnfolded(): Unfolded {
  const held = use(UnfoldedService)

  if (held === null) {
    throw new Error(
      'A service table unfolds through the provider above it, and there is none.',
    )
  }

  return held
}

function CategoryBadge({ service }: { service: ServiceRow }) {
  return (
    <Badge variant={service.minorCategory ? 'kindData' : 'kindTv'}>
      {service.category}
    </Badge>
  )
}

export function ServiceTable({
  services,
  actions,
}: {
  services: ServiceRow[]
  actions: CandidateActions
}) {
  const { open, toggle } = useUnfolded()

  return (
    <Table className="min-w-[860px]" containerClassName="pb-1">
      <TableHeader>
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
                  className="inline-flex text-ink-3 hover:text-ink"
                >
                  {expanded ? (
                    <ChevronDownIcon className="size-3.5" />
                  ) : (
                    <ChevronRightIcon className="size-3.5" />
                  )}
                </button>
              </TableCell>
              <TableCell>
                <b className="text-[13px] font-bold">{service.name}</b>
                <span className="ml-2 font-code text-cap text-ink-3">
                  {service.sid}
                </span>
              </TableCell>
              <TableCell>
                <CategoryBadge service={service} />
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
                <span
                  className={
                    service.enabled
                      ? 'text-ui font-medium text-ink'
                      : 'text-ui text-ink-3'
                  }
                >
                  {service.enabled ? '有効' : '無効'}
                </span>
              </TableCell>
              <TableCell className="font-code text-sub whitespace-nowrap text-ink-2">
                {service.lastSeen}
              </TableCell>
              <TableCell>
                {service.currentChannel === undefined ? (
                  <Badge variant="warn" className="font-bold">
                    要対応
                  </Badge>
                ) : (
                  service.betterChannel !== undefined && (
                    <Badge variant="sky" className="font-bold">
                      実測上位の候補 {service.betterChannel}
                    </Badge>
                  )
                )}
              </TableCell>
            </TableRow>,
            expanded && (
              <TableRow key={`${service.key}-candidates`}>
                <TableCell
                  colSpan={SERVICE_COLUMNS.length}
                  className="bg-surface-2 py-3.5 pr-[18px] pl-10"
                >
                  <CandidateList
                    serviceKey={service.key}
                    serviceName={service.name}
                    candidates={service.candidates}
                    {...actions}
                  />
                </TableCell>
              </TableRow>
            ),
          ]
        })}
      </TableBody>
    </Table>
  )
}
