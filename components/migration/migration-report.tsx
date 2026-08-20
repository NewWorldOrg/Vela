import Link from 'next/link'

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
import { Banner } from '@/components/vela/banner'
import {
  CheckIcon,
  MarkDots,
  MarkPanel,
  MarkSlashes,
  MarkType,
} from '@/components/vela/icons'
import { SectionHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'
import { MigrationCountCell } from '@/components/migration/migration-count-cell'
import { MigrationRunRow } from '@/components/migration/migration-run-row'

const NOT_TAKEN_COLUMNS = ['対象', '母集団', '記録した事実', '該当行へ飛ぶ']

export function MigrationReport({ result }: { result: MigrationResult }) {
  const { run } = result

  return (
    <>
      <Banner className="mt-3.5">
        <b className="block">この画面は読み取り専用です。</b>
        移行の実行は CLI
        で行います。移行できなかった件数は、品質画面やライブラリの不整合件数には合算されません。
      </Banner>

      <section className="mt-5">
        <SectionHeading mark={MarkDots}>実行情報</SectionHeading>
        <p className="-mt-1.5 mb-3 text-note text-ink-2">
          いつ・どこから・どの区分で実行したか。
        </p>
        <Surface>
          <div className="flex flex-wrap items-center gap-2.5">
            <b className="text-ui font-bold">{run.heading}</b>
            <Badge variant="selected">{run.kind}</Badge>
            <Badge variant="mute">{run.dryRuns}</Badge>
          </div>
          <dl className="mt-3 space-y-2.5">
            <MigrationRunRow label="実行日時">
              <span className="font-code tabular-nums">{run.startedAt}</span>{' '}
              開始 /{' '}
              <span className="font-code tabular-nums">{run.finishedAt}</span>{' '}
              完了({run.duration})
            </MigrationRunRow>
            <MigrationRunRow label="移行元の識別">{run.source}</MigrationRunRow>
            <MigrationRunRow label="下見・本番の別">
              {run.dryRunNote}
            </MigrationRunRow>
            <MigrationRunRow label="取り込み先">{run.output}</MigrationRunRow>
          </dl>
          <p className="mt-3 border-t border-dashed border-line pt-3 text-note text-ink-3">
            {run.foot}
          </p>
        </Surface>
      </section>

      <section className="mt-5">
        <SectionHeading mark={MarkPanel}>母集団サマリ</SectionHeading>
        <p className="-mt-1.5 mb-3 text-note text-ink-2">
          移行元に存在したすべての行・すべてのファイルを、5つの母集団に分けて数えています。
        </p>
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
                {population.link ? (
                  <Link
                    href={population.link.href}
                    className="ml-auto text-note font-bold text-brand underline-offset-[3px] hover:underline"
                  >
                    {population.link.label}
                  </Link>
                ) : (
                  <span className="ml-auto text-note text-ink-3">
                    {population.note}
                  </span>
                )}
              </div>
            </Surface>
          ))}
        </div>
        <p className="mt-2.5 text-note text-ink-3">{result.populationsNote}</p>

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
            <p className="text-sub">{result.unclassifiedNote}</p>
          </div>
        </div>
      </section>

      <section className="mt-5">
        <SectionHeading mark={MarkType}>
          取り込まなかったものの明細
        </SectionHeading>
        <p className="-mt-1.5 mb-3 text-note text-ink-2">
          理由分類ごとに並べています。理由を単一の文字列に潰すことはせず、打ち切りもしません。
        </p>
        <Table className="min-w-[860px]" containerClassName="pb-1">
          <TableHeader>
            <TableRow>
              {NOT_TAKEN_COLUMNS.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          {result.notTakenGroups.map((group) => (
            <TableBody key={group.name}>
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="border-b-0 pt-3.5 pb-1.5">
                  <span className="flex flex-wrap items-baseline gap-2.5">
                    <b className="text-ui font-bold">{group.name}</b>
                    <span className="font-code text-ui tabular-nums text-brand">
                      {group.count}
                      <em className="ml-0.5 font-sans text-note text-ink-3 not-italic">
                        {group.unit}
                      </em>
                    </span>
                    <span className="text-note text-ink-3">{group.body}</span>
                  </span>
                </TableCell>
              </TableRow>
              {group.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="w-[260px] align-top">
                    {row.target && (
                      <b className="block text-[13px] font-bold">
                        {row.target}
                      </b>
                    )}
                    <span className="font-code text-note text-ink-3">
                      {row.file}
                    </span>
                  </TableCell>
                  <TableCell className="align-top text-ink-2">
                    {row.population}
                  </TableCell>
                  <TableCell className="align-top whitespace-normal text-ink-2">
                    {row.fact}
                  </TableCell>
                  <TableCell className="align-top">
                    {row.link ? (
                      <Link
                        href={row.link.href}
                        className="font-bold text-brand underline-offset-[3px] hover:underline"
                      >
                        {row.link.label}
                      </Link>
                    ) : (
                      <span className="text-ink-3">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {group.empty && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="whitespace-normal text-ink-3"
                  >
                    {group.empty}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          ))}
        </Table>
        <p className="mt-2.5 text-note text-ink-3">{result.notTakenNote}</p>
      </section>

      <section className="mt-5">
        <SectionHeading mark={MarkSlashes}>やらなかったこと</SectionHeading>
        <p className="-mt-1.5 mb-3 text-note text-ink-2">
          運ばなかったものも 1
          行として記録します。記録に残さないと、後から機能欠落と区別できません
        </p>
        <div className="space-y-2">
          {result.omissions.map((omission) => (
            <Surface
              key={omission.id}
              className="flex flex-wrap items-start gap-3"
            >
              <Badge variant="mute" className="mt-px">
                {omission.tag}
              </Badge>
              <div className="min-w-0 flex-1">
                <b className="text-ui font-bold">
                  {omission.title}
                  {omission.code && (
                    <span className="ml-1.5 font-code text-note font-medium text-ink-3">
                      {omission.code}
                    </span>
                  )}
                </b>
                <p className="mt-0.5 text-note text-ink-2">{omission.body}</p>
              </div>
              <span className="font-code text-ui font-medium tabular-nums">
                {omission.count}
                <em className="ml-0.5 font-sans text-note not-italic text-ink-3">
                  {omission.unit}
                </em>
              </span>
            </Surface>
          ))}
        </div>
      </section>
    </>
  )
}
