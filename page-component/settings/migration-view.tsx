import Link from 'next/link'

import type { MigrationResult } from '@/repository/migration'
import { Badge } from '@/components/ui/badge'
import { Banner } from '@/components/vela/banner'
import { Crumb, CrumbCurrent } from '@/components/vela/app-shell'
import { EmptyState } from '@/components/vela/empty-state'
import {
  CheckIcon,
  MarkDots,
  MarkPanel,
  MarkSlashes,
  MarkType,
} from '@/components/vela/icons'
import { PageHeading, SectionHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'

export function MigrationView({ result }: { result: MigrationResult | null }) {
  return (
    <>
      <Crumb>
        設定 / <CrumbCurrent>移行記録</CrumbCurrent>
      </Crumb>
      <PageHeading description="移行で何が運ばれ、何が運ばれなかったかを、いつでも言えるようにするための記録です。処理は一度きりですが、記録は恒久に残ります">
        移行記録
      </PageHeading>

      {result === null ? (
        <EmptyState
          spot="tape"
          title="移行の記録がありません"
          className="mt-3.5"
        >
          移行はまだ一度も実行されていません。実行するとここに記録が残り、管理メニューにも「移行記録」が現れます。
        </EmptyState>
      ) : (
        <MigrationReport result={result} />
      )}
    </>
  )
}

function MigrationReport({ result }: { result: MigrationResult }) {
  const { run } = result

  return (
    <>
      <Banner className="mt-3.5">
        <b>この画面は読み取り専用です。</b>
        移行の実行は CLI
        で行います。移行できなかった件数は、品質画面やライブラリの不整合件数には合算されません。
      </Banner>

      <section className="mt-5">
        <SectionHeading mark={MarkDots}>実行情報</SectionHeading>
        <p className="-mt-1.5 mb-3 text-note text-ink-2">
          いつ・どこから・どの区分で実行したか
        </p>
        <Surface>
          <div className="flex flex-wrap items-center gap-2.5">
            <b className="text-ui font-bold">{run.heading}</b>
            <Badge variant="selected">{run.kind}</Badge>
            <Badge variant="mute">{run.dryRuns}</Badge>
          </div>
          <dl className="mt-3 space-y-2.5">
            <RunRow label="実行日時">
              <span className="font-code tabular-nums">{run.startedAt}</span>{' '}
              開始 /{' '}
              <span className="font-code tabular-nums">{run.finishedAt}</span>{' '}
              完了({run.duration})
            </RunRow>
            <RunRow label="移行元の識別">{run.source}</RunRow>
            <RunRow label="下見・本番の別">{run.dryRunNote}</RunRow>
            <RunRow label="取り込み先">{run.output}</RunRow>
          </dl>
          <p className="mt-3 border-t border-dashed border-line pt-3 text-note text-ink-3">
            {run.foot}
          </p>
        </Surface>
      </section>

      <section className="mt-5">
        <SectionHeading mark={MarkPanel}>母集団サマリ</SectionHeading>
        <p className="-mt-1.5 mb-3 text-note text-ink-2">
          移行元に存在したすべての行・すべてのファイルを、5つの母集団に分けて数えています
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
                <CountCell
                  tint="bg-tint-sage"
                  label="取り込んだ"
                  value={population.taken}
                  unit={population.unit}
                />
                <CountCell
                  tint="bg-tint-salmon"
                  label="取り込まなかった"
                  value={population.notTaken}
                  unit={population.unit}
                />
                <CountCell
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
          理由分類ごとに並べています。理由を単一の文字列に潰すことはせず、打ち切りもしません
        </p>
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <table className="w-full min-w-[860px] border-separate border-spacing-0">
            <thead>
              <tr>
                {['対象', '母集団', '記録した事実', '該当行へ飛ぶ'].map(
                  (head) => (
                    <th
                      key={head}
                      className="bg-surface-2 px-3.5 py-[9px] text-left text-[10.5px] font-bold tracking-[0.05em] whitespace-nowrap text-ink-3 first:rounded-l-md last:rounded-r-md"
                    >
                      {head}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            {result.notTakenGroups.map((group) => (
              <tbody key={group.name}>
                <tr>
                  <td colSpan={4} className="pt-3.5 pb-1.5">
                    <span className="flex flex-wrap items-baseline gap-2.5">
                      <b className="text-ui font-bold">{group.name}</b>
                      <span className="font-code text-ui tabular-nums text-brand">
                        {group.count}
                        <em className="ml-0.5 font-sans text-note not-italic text-ink-3">
                          {group.unit}
                        </em>
                      </span>
                      <span className="text-note text-ink-3">{group.body}</span>
                    </span>
                  </td>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.id}>
                    <Td className="w-[260px]">
                      {row.target && (
                        <b className="block text-[13px] font-bold">
                          {row.target}
                        </b>
                      )}
                      <span className="font-code text-note text-ink-3">
                        {row.file}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap text-ink-2">
                      {row.population}
                    </Td>
                    <Td className="text-ink-2">{row.fact}</Td>
                    <Td className="whitespace-nowrap">
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
                    </Td>
                  </tr>
                ))}
                {group.empty && (
                  <tr>
                    <Td colSpan={4} className="text-ink-3">
                      {group.empty}
                    </Td>
                  </tr>
                )}
              </tbody>
            ))}
          </table>
        </div>
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

function RunRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-0.5 min-[760px]:grid-cols-[150px_1fr] min-[760px]:gap-4">
      <dt className="text-ui text-ink-3">{label}</dt>
      <dd className="text-ui text-ink-2">{children}</dd>
    </div>
  )
}

function CountCell({
  tint,
  label,
  value,
  unit,
}: {
  tint: string
  label: string
  value: string
  unit: string
}) {
  return (
    <span
      className={`flex min-w-[130px] flex-col rounded-lg px-3 py-2 text-ink ${tint}`}
    >
      <span className="text-note">{label}</span>
      <span className="font-code text-[19px] leading-tight font-medium tabular-nums">
        {value}
        <em className="ml-0.5 font-sans text-note not-italic">{unit}</em>
      </span>
    </span>
  )
}

function Td({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      className={`border-b border-dashed border-line px-3.5 py-3 align-top text-[13px] ${className ?? ''}`}
      {...props}
    />
  )
}
