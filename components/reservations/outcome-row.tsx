'use client'

import type { ReservationOutcome } from '@/repository/reservation-outcomes'
import { TableCell, TableRow } from '@/components/ui/table'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ListIcon,
} from '@/components/vela/icons'
import { OutcomeKindChip } from '@/components/reservations/outcome-kind-chip'

const GONE = '記録が残っていません'

export const OUTCOME_COLUMN_COUNT = 8

export function OutcomeRow({
  outcome,
  expanded,
  onToggle,
}: {
  outcome: ReservationOutcome
  expanded: boolean
  onToggle: () => void
}) {
  const instead = outcome.instead

  return (
    <>
      <TableRow>
        <TableCell className="align-top">
          {instead.length > 0 && (
            <button
              type="button"
              aria-expanded={expanded}
              aria-label={`${outcome.title} の代わりに録られた予約`}
              onClick={onToggle}
              className="tap-target flex size-6 cursor-pointer items-center justify-center rounded-full text-ink-2 transition-colors duration-150 hover:bg-surface-2 [&_svg]:size-3.5"
            >
              {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
            </button>
          )}
        </TableCell>
        <TableCell className="align-top whitespace-normal">
          <b className="block text-[13px] font-bold">{outcome.title}</b>
        </TableCell>
        <TableCell className="align-top">
          {outcome.channelName}
          <small className="ml-1.5 font-code text-[10.5px] text-ink-3">
            {outcome.channelNo}
          </small>
        </TableCell>
        <TableCell className="align-top font-code text-ink-2">
          {outcome.whenLabel}
        </TableCell>
        <TableCell className="align-top">
          {outcome.ruleName ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-[11px] py-0.5 text-note text-ink-2">
              <ListIcon className="size-3" />
              {outcome.ruleName}
            </span>
          ) : (
            <span className="text-ink-2">{outcome.origin}</span>
          )}
        </TableCell>
        <TableCell className="text-right align-top font-code tabular-nums text-ink-2">
          {outcome.priority}
        </TableCell>
        <TableCell className="align-top">
          <OutcomeKindChip outcome={outcome} />
        </TableCell>
        <TableCell className="align-top font-code text-ink-2">
          {outcome.occurredLabel}
        </TableCell>
      </TableRow>
      {expanded && instead.length > 0 && (
        <TableRow className="hover:bg-transparent">
          <TableCell
            colSpan={OUTCOME_COLUMN_COUNT}
            className="border-b-0 px-3.5 pb-3"
          >
            <div className="rounded-lg bg-surface px-4 py-3.5">
              <div className="text-cap font-bold tracking-[0.04em] text-ink-3">
                代わりに録られた予約
              </div>
              <div className="mt-2 space-y-1.5">
                {instead.map((one) => (
                  <div
                    key={one.key}
                    className="flex flex-wrap items-center gap-3 rounded-md bg-surface-2 px-3 py-2 text-sub"
                  >
                    <span className="min-w-0 flex-1 font-medium">
                      {one.title ?? GONE}
                    </span>
                    {one.meta && (
                      <span className="font-code text-ink-2">{one.meta}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
