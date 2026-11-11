'use client'

import type {
  CandidateTuning,
  ServiceRow,
  WriteResult,
} from '@/repository/services'
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
import { Unfold } from '@/components/vela/unfold'
import { CandidateList } from '@/components/channels/candidate-list'
import { cn } from '@/lib/utils'
import { WHEN_LABELS } from '@/lib/when-terms'
import { useUnfolded } from '@/components/channels/unfolding-services'
import { ServiceLine } from '@/components/channels/service-line'

const SERVICE_COLUMNS: {
  label: string
  width: string | undefined
  hidden?: boolean
}[] = [
  { label: '候補チャンネルの開閉', width: 'calc(34rem/16)', hidden: true },
  { label: 'サービス', width: undefined },
  { label: '区分', width: 'calc(84rem/16)' },
  { label: '現在の物理ch', width: 'calc(110rem/16)' },
  { label: '候補', width: 'calc(104rem/16)' },
  { label: '有効', width: 'calc(80rem/16)' },
  { label: WHEN_LABELS.taken, width: 'calc(122rem/16)' },
  { label: '状態', width: 'calc(150rem/16)', hidden: true },
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

function UnfoldedCandidates({
  service,
  actions,
  expanded,
}: {
  service: ServiceRow
  actions: CandidateActions
  expanded: boolean
}) {
  return (
    <TableRow className="[&:last-child_[data-slot=unfold-body]]:border-b-0">
      <TableCell colSpan={SERVICE_COLUMNS.length} className="border-0 p-0">
        <Unfold
          open={expanded}
          bodyClassName="border-b border-hair bg-surface-2 py-3.5 pr-[calc(18rem/16)] pl-10"
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
  const { open, folding, toggle } = useUnfolded()

  return (
    <Table
      cards
      className="table-fixed min-w-[calc(840rem/16)]"
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
            <ServiceLine
              key={service.key}
              service={service}
              expanded={expanded}
              onToggle={toggle}
            />,
            mounted && (
              <UnfoldedCandidates
                key={`${service.key}-candidates`}
                service={service}
                actions={actions}
                expanded={expanded}
              />
            ),
          ]
        })}
      </TableBody>
    </Table>
  )
}
