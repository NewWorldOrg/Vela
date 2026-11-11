import { EMPTY_VALUE } from '@/lib/empty-value'

import { cn } from '@/lib/utils'
import { SCAN_STATE_LABEL, type ScanRun } from '@/repository/services'
import { StateSay } from '@/components/recordings/state-say'
import {
  StatusCell,
  stateColumnFor,
  type StateTone,
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
import { cardPlace } from '@/components/ui/table-cards'
import { ADMIN_LIST_HEIGHT_CAP } from '@/components/vela/app-shell'
import { EmptyState } from '@/components/vela/empty-state'
import { SectionHeading } from '@/components/vela/section-heading'

const SCAN_STATE_COLUMN = stateColumnFor(Object.values(SCAN_STATE_LABEL))

function runToneOf(state: ScanRun['state']): StateTone {
  switch (state) {
    case 'completed':
      return 'ok'
    case 'running':
      return 'info'
    case 'failed':
      return 'err'
    default:
      return 'mute'
  }
}

export function ScanHistory({ history }: { history: ScanRun[] }) {
  return (
    <section id="scan-history" className="mt-10">
      <SectionHeading>スキャン履歴</SectionHeading>
      {history.length === 0 ? (
        <EmptyState usher={null} title="まだスキャン履歴がありません" />
      ) : (
        <Table
          cards
          className="table-fixed min-w-[calc(560rem/16)]"
          containerClassName={cn(ADMIN_LIST_HEIGHT_CAP, 'overflow-y-auto pb-1')}
        >
          <TableColumns
            widths={[
              'calc(180rem/16)',
              SCAN_STATE_COLUMN,
              'calc(112rem/16)',
              'calc(180rem/16)',
            ]}
          />
          <TableHeader className="[&>tr>th]:sticky [&>tr>th]:top-0 [&>tr>th]:z-10">
            <TableRow>
              {['開始', '状態', '所要', '終了'].map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((run) => (
              <TableRow key={run.id}>
                <TableCell
                  {...cardPlace('lead')}
                  className="font-code text-sub tabular-nums whitespace-nowrap text-ink-2"
                >
                  {run.startedAt}
                </TableCell>
                <TableCell {...cardPlace('field', '状態')}>
                  <StatusCell>
                    <StateSay tone={runToneOf(run.state)} bold>
                      {run.stateLabel}
                    </StateSay>
                  </StatusCell>
                </TableCell>
                <TableCell
                  {...cardPlace('field', '所要')}
                  className="font-code text-sub tabular-nums whitespace-nowrap text-ink-2"
                >
                  {run.took ?? EMPTY_VALUE}
                </TableCell>
                <TableCell
                  {...cardPlace('field', '終了')}
                  className="font-code text-sub tabular-nums whitespace-nowrap text-ink-2"
                >
                  {run.finishedAt ?? EMPTY_VALUE}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}
