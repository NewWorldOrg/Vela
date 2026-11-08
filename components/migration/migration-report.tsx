import Link from 'next/link'

import { cn } from '@/lib/utils'
import type { MigrationResult } from '@/repository/migration'
import { Badge } from '@/components/ui/badge'
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
import {
  CheckIcon,
  MarkDots,
  MarkPanel,
  MarkSlashes,
  MarkType,
} from '@/components/vela/icons'
import { ADMIN_LIST_HEIGHT_CAP } from '@/components/vela/app-shell'
import { SectionHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'
import { MigrationCountCell } from '@/components/migration/migration-count-cell'
import { MigrationRunRow } from '@/components/migration/migration-run-row'

const NOT_TAKEN_COLUMNS: { label: string; width: string }[] = [
  { label: '対象', width: 'calc(220rem/16)' },
  { label: '母集団', width: 'calc(160rem/16)' },
  { label: '記録内容', width: 'calc(480rem/16)' },
]

const NO_LOSSES = '対象なし'

export function MigrationReport({ result }: { result: MigrationResult }) {
  const { run } = result

  return (
    <>
      <section className="mt-5">
        <SectionHeading>実行情報</SectionHeading>
        <Surface>
          <div className="flex flex-wrap items-center gap-2.5">
            <b className="text-[calc(14.5rem/16)] font-semibold">
              {run.heading}
            </b>
            <Badge variant="mute">{run.kind}</Badge>
            <Badge variant="mute">{run.rehearsals}</Badge>
          </div>
          <dl className="mt-3 space-y-2.5">
            <MigrationRunRow label="実行">
              <span className="font-code tabular-nums">{run.startedAt}</span>{' '}
              開始 /{' '}
              <span className="font-code tabular-nums">{run.finishedAt}</span>{' '}
              完了({run.duration})
            </MigrationRunRow>
            <MigrationRunRow label="移行元の識別">{run.source}</MigrationRunRow>
            <MigrationRunRow label="直前の下見">
              {run.lastRehearsal}
            </MigrationRunRow>
          </dl>
        </Surface>
      </section>

      <section className="mt-5">
        <SectionHeading>母集団サマリ</SectionHeading>
        <div className="overflow-hidden rounded-lg bg-surface">
          {result.populations.map((population) => (
            <div
              key={population.name}
              data-slot="migration-population"
              className="grid gap-3 border-b border-hair px-4 py-3.5 last:border-b-0 min-[900px]:grid-cols-[calc(240rem/16)_1fr] min-[900px]:items-center"
            >
              <div>
                <b className="text-[calc(14.5rem/16)] font-semibold">
                  {population.name}
                </b>
                <span className="ml-2 font-code text-note break-keep text-ink-2">
                  {population.source}
                </span>
                <span className="mt-0.5 block text-note text-ink-2">
                  母集団{' '}
                  <span className="font-code tabular-nums">
                    {population.total}
                  </span>{' '}
                  {population.unit}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <MigrationCountCell
                  label="取り込み済み"
                  value={population.taken}
                  unit={population.unit}
                />
                <MigrationCountCell
                  label="未取り込み"
                  value={population.notTaken}
                  unit={population.unit}
                />
                <MigrationCountCell
                  label="未分類"
                  value={population.unclassified}
                  unit={population.unit}
                />
                {population.link && (
                  <Link
                    href={population.link.href}
                    className="tap-target ml-auto text-ui font-semibold text-acc-text underline-offset-[3px] hover:underline"
                  >
                    {population.link.label}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2 px-1 text-ink">
          <CheckIcon className="size-4 text-ink-2" />
          <div className="min-w-0">
            <b className="block text-ui font-semibold">
              未分類{' '}
              <span className="font-code tabular-nums">
                {result.unclassified}
              </span>{' '}
              件
            </b>
          </div>
        </div>
      </section>

      <section className="mt-5">
        <SectionHeading>未取り込みの明細</SectionHeading>
        <Table
          cards
          className="table-fixed min-w-[calc(860rem/16)]"
          containerClassName={cn(ADMIN_LIST_HEIGHT_CAP, 'overflow-y-auto pb-1')}
        >
          <TableColumns
            widths={NOT_TAKEN_COLUMNS.map((column) => column.width)}
          />
          <TableHeader className="[&>tr>th]:sticky [&>tr>th]:top-0 [&>tr>th]:z-10">
            <TableRow>
              {NOT_TAKEN_COLUMNS.map((column) => (
                <TableHead key={column.label}>{column.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          {result.notTakenGroups.map((group) => (
            <TableBody key={group.name}>
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={3} className="border-b-0 pt-3.5 pb-1.5">
                  <span className="flex flex-wrap items-baseline gap-2.5 max-[600px]:px-3.5 max-[600px]:pt-3.5 max-[600px]:pb-1.5">
                    <b className="text-ui font-bold">{group.name}</b>
                    <span className="text-ui font-semibold tabular-nums text-ink">
                      {group.count}
                      <em className="ml-0.5 font-sans text-note text-ink-2 not-italic">
                        {group.unit}
                      </em>
                    </span>
                    {group.reason && (
                      <span className="text-note text-ink-2">
                        {group.reason}
                      </span>
                    )}
                  </span>
                </TableCell>
              </TableRow>
              {group.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell
                    {...cardPlace('lead')}
                    className="w-[calc(260rem/16)] align-top whitespace-normal"
                  >
                    <b className="text-ui font-semibold wrap-anywhere">
                      {row.subject}
                    </b>
                  </TableCell>
                  <TableCell
                    {...cardPlace('field', '母集団')}
                    className="align-top text-ink-2"
                  >
                    {row.population}
                  </TableCell>
                  <TableCell
                    {...cardPlace('field', '記録内容')}
                    className="align-top whitespace-normal"
                  >
                    <span className="font-code text-note tabular-nums text-ink-2">
                      {row.fact}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {group.empty && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="whitespace-normal text-ink-2"
                  >
                    <span className="max-[600px]:block max-[600px]:px-3.5 max-[600px]:py-3">
                      {group.empty}
                    </span>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          ))}
        </Table>
      </section>

      <section className="mt-5">
        <SectionHeading>移行後の欠落</SectionHeading>
        <div className="overflow-hidden rounded-lg bg-surface text-ui">
          {result.losses.map((loss) => (
            <div
              key={loss.id}
              className="border-b border-hair px-4 py-3.5 last:border-b-0"
            >
              <b className="font-semibold">{loss.subject}</b>
              <span className="text-ink-2"> — {loss.fact}</span>
            </div>
          ))}
          {result.losses.length === 0 && (
            <Surface className="text-ink-2">{NO_LOSSES}</Surface>
          )}
        </div>
      </section>
    </>
  )
}
