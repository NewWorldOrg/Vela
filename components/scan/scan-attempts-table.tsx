'use client'

import { EMPTY_VALUE } from '@/lib/empty-value'

import type { ScanAttemptRow } from '@/repository/services'
import { cn } from '@/lib/utils'
import { NOT_YET_IN_THIS_BUILD } from '@/lib/not-yet-in-this-build'
import { NOT_YET_NAMED } from '@/repository/scan-failures'
import { ADMIN_LIST_HEIGHT_CAP } from '@/components/vela/app-shell'
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
import { CheckIcon } from '@/components/vela/icons'
import { FailureLabel } from '@/components/scan/failure-label'
import { WHEN_LABELS } from '@/lib/when-terms'

const RESULT_COLUMNS: { label: string; width: string }[] = [
  { label: '物理ch', width: 'calc(112rem/16)' },
  { label: '結果', width: 'calc(240rem/16)' },
  { label: '実測', width: 'calc(200rem/16)' },
  { label: '所要', width: 'calc(112rem/16)' },
  { label: WHEN_LABELS.taken, width: 'calc(122rem/16)' },
]

function AttemptResult({ attempt }: { attempt: ScanAttemptRow }) {
  if (attempt.failure === undefined) {
    return (
      <span className="inline-flex items-center gap-2 text-ui text-ink">
        <span className="inline-flex size-[calc(19rem/16)] shrink-0 items-center justify-center rounded-full bg-surface-2">
          <CheckIcon className="size-[calc(11rem/16)] text-ink" />
        </span>
        サービスを取得
      </span>
    )
  }

  if (attempt.failure === NOT_YET_NAMED) {
    return (
      <span
        data-slot="attempt-not-yet-named"
        className="inline-flex items-center gap-2 text-ui text-ink-2"
      >
        <span
          aria-hidden="true"
          className="inline-flex size-[calc(19rem/16)] shrink-0 items-center justify-center rounded-full bg-surface-3 font-code text-cap leading-none font-medium text-ink-2"
        >
          ?
        </span>
        {NOT_YET_IN_THIS_BUILD}
      </span>
    )
  }

  return (
    <FailureLabel failure={attempt.failure}>
      {attempt.streamMismatch}
    </FailureLabel>
  )
}

export function ScanAttemptsTable({
  attempts,
}: {
  attempts: ScanAttemptRow[]
}) {
  return (
    <Table
      cards
      className="table-fixed min-w-[calc(720rem/16)]"
      containerClassName={cn(ADMIN_LIST_HEIGHT_CAP, 'overflow-y-auto pb-1')}
    >
      <TableColumns widths={RESULT_COLUMNS.map((column) => column.width)} />
      <TableHeader className="[&>tr>th]:sticky [&>tr>th]:top-0 [&>tr>th]:z-10">
        <TableRow>
          {RESULT_COLUMNS.map((column) => (
            <TableHead key={column.label}>{column.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {attempts.map((attempt) => (
          <TableRow key={attempt.id}>
            <TableCell
              {...cardPlace('lead')}
              className="font-code text-body font-medium tabular-nums whitespace-nowrap"
            >
              {attempt.channel}
            </TableCell>
            <TableCell {...cardPlace('field', '結果')}>
              <AttemptResult attempt={attempt} />
            </TableCell>
            <TableCell
              {...cardPlace('field', '実測')}
              className="font-code text-sub tabular-nums whitespace-nowrap text-ink-2"
            >
              {attempt.measurement?.value ?? EMPTY_VALUE}
            </TableCell>
            <TableCell
              {...cardPlace('field', '所要')}
              className="font-code text-sub tabular-nums whitespace-nowrap text-ink-2"
            >
              {attempt.took ?? EMPTY_VALUE}
            </TableCell>
            <TableCell
              {...cardPlace('meta')}
              className="font-code text-sub tabular-nums whitespace-nowrap text-ink-2"
            >
              {attempt.at}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
