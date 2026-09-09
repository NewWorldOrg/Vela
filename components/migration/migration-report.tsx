import Link from 'next/link'

import { cn } from '@/lib/utils'
import type { MigrationResult } from '@/repository/migration'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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

const NOT_TAKEN_COLUMNS = ['対象', '母集団', '記録した事実']

const NO_LOSSES = '該当なし'

export function MigrationReport({ result }: { result: MigrationResult }) {
  const { run } = result

  return (
    <>
      <section className="mt-5">
        <SectionHeading mark={MarkDots}>実行情報</SectionHeading>
        <Surface>
          <div className="flex flex-wrap items-center gap-2.5">
            <b className="text-ui font-bold">{run.heading}</b>
            <Badge variant="selected">{run.kind}</Badge>
            <Badge variant="mute">{run.rehearsals}</Badge>
          </div>
          <dl className="mt-3 space-y-2.5">
            <MigrationRunRow label="実行日時">
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
        <SectionHeading mark={MarkPanel}>母集団サマリ</SectionHeading>
        <div className="space-y-2.5">
          {result.populations.map((population) => (
            <Surface
              key={population.name}
              className="grid gap-3 min-[900px]:grid-cols-[240px_1fr] min-[900px]:items-center"
            >
              <div>
                <b className="text-ui font-bold">{population.name}</b>
                <span className="ml-2 font-code text-note text-ink-3">
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
                  tint="bg-tint-sage"
                  label="取り込んだ"
                  value={population.taken}
                  unit={population.unit}
                />
                <MigrationCountCell
                  tint="bg-tint-salmon"
                  label="取り込まなかった"
                  value={population.notTaken}
                  unit={population.unit}
                />
                <MigrationCountCell
                  tint="bg-tint-sky"
                  label="未分類"
                  value={population.unclassified}
                  unit={population.unit}
                />
                {population.link && (
                  <Link
                    href={population.link.href}
                    className="tap-target ml-auto text-note font-bold text-brand underline-offset-[3px] hover:underline"
                  >
                    {population.link.label}
                  </Link>
                )}
              </div>
            </Surface>
          ))}
        </div>

        <div className="mt-2.5 flex items-start gap-[11px] rounded-lg bg-mint-soft px-[15px] py-3 text-mint">
          <CheckIcon className="mt-[3px] size-[17px]" />
          <div className="min-w-0">
            <b className="block text-ui">
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
        <SectionHeading mark={MarkType}>
          取り込まなかったものの明細
        </SectionHeading>
        <Table
          className="min-w-[860px]"
          containerClassName={cn(ADMIN_LIST_HEIGHT_CAP, 'overflow-y-auto pb-1')}
        >
          <TableHeader className="[&>tr>th]:sticky [&>tr>th]:top-0 [&>tr>th]:z-10">
            <TableRow>
              {NOT_TAKEN_COLUMNS.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          {result.notTakenGroups.map((group) => (
            <TableBody key={group.name}>
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={3} className="border-b-0 pt-3.5 pb-1.5">
                  <span className="flex flex-wrap items-baseline gap-2.5">
                    <b className="text-ui font-bold">{group.name}</b>
                    <span className="font-code text-ui tabular-nums text-brand">
                      {group.count}
                      <em className="ml-0.5 font-sans text-note text-ink-3 not-italic">
                        {group.unit}
                      </em>
                    </span>
                  </span>
                </TableCell>
              </TableRow>
              {group.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="w-[260px] align-top whitespace-normal">
                    <b className="text-ui font-bold wrap-anywhere">
                      {row.subject}
                    </b>
                  </TableCell>
                  <TableCell className="align-top text-ink-2">
                    {row.population}
                  </TableCell>
                  <TableCell className="align-top whitespace-normal">
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
                    className="whitespace-normal text-ink-3"
                  >
                    {group.empty}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          ))}
        </Table>
      </section>

      <section className="mt-5">
        <SectionHeading mark={MarkSlashes}>
          運んだものに残った欠け
        </SectionHeading>
        <div className="space-y-2">
          {result.losses.map((loss) => (
            <Surface key={loss.id} className="text-ui">
              <b className="font-bold">{loss.subject}</b>
              <span className="text-ink-2"> — {loss.fact}</span>
            </Surface>
          ))}
          {result.losses.length === 0 && (
            <Surface className="text-ui text-ink-3">{NO_LOSSES}</Surface>
          )}
        </div>
      </section>
    </>
  )
}
