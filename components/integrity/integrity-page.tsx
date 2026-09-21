'use client'

import { cn } from '@/lib/utils'
import { useState } from 'react'
import Link from 'next/link'

import { shapeFor } from '@/lib/not-yet-in-this-build'

import type {
  FindingDiscarded,
  IntegrityFault,
  IntegrityFinding,
  IntegrityResult,
  SweepWrite,
} from '@/repository/integrity'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Banner } from '@/components/vela/banner'
import { EmptyState } from '@/components/vela/empty-state'
import {
  ChevronLeftIcon,
  QualityIcon,
  TrashIcon,
} from '@/components/vela/icons'
import { ActionRow } from '@/components/vela/action-row'
import { SectionHeading } from '@/components/vela/section-heading'
import { DetailStat } from '@/components/recordings/detail-stat'
import { DeleteFindingDialog } from '@/components/integrity/delete-finding-dialog'
import { RunCheckButton } from '@/components/integrity/run-check-button'
import { ScreenMain } from '@/components/vela/app-shell'

const COLUMNS: { label: string; hidden?: boolean }[] = [
  { label: 'ファイル' },
  { label: '理由' },
  { label: 'サイズ' },
  { label: '検出' },
  { label: '操作', hidden: true },
]

const OWNED_BY_NO_RECORDING: readonly IntegrityFault[] = ['noLedgerRow']

const NOT_YET_KNOWN_TONE = 'text-ink-3'

const REASON_TONE: Record<IntegrityFault, string> = {
  noLedgerRow: 'text-ink-2',
  sizeDisagrees: 'text-lemon',
  fileMissing: 'text-lemon',
  fileEmpty: 'text-coral',
  emptyThoughComplete: 'text-coral',
}

export function IntegrityView({
  result,
  onRun,
  onDelete,
}: {
  result: IntegrityResult
  onRun: () => Promise<SweepWrite>
  onDelete: (findingId: string) => Promise<FindingDiscarded>
}) {
  const { check, findings, roots } = result
  const [asked, setAsked] = useState<IntegrityFinding | null>(null)
  const ranAt = check?.ranAt ?? ''
  const [thrownAway, setThrownAway] = useState<{
    ranAt: string
    path: string
  }>()
  const discarded = thrownAway?.ranAt === ranAt ? thrownAway.path : undefined

  const throwAway = async (findingId: string): Promise<FindingDiscarded> => {
    const thrown = await onDelete(findingId)

    if (thrown.state === 'ok') {
      const gone = findings.find((one) => one.id === findingId)

      if (gone) {
        setThrownAway({ ranAt, path: gone.path })
      }
    }

    return thrown
  }

  return (
    <ScreenMain
      scroll="within"
      className="flex flex-col px-3.5 pt-6 pb-6 min-[701px]:px-5 min-[1061px]:px-[30px]"
    >
      <div className="mb-3">
        <Link
          href="/library"
          className="tap-target inline-flex items-center gap-[7px] rounded-full border border-edge py-[5px] pr-[13px] pl-2.5 text-ui font-medium text-ink-2 no-underline transition-[translate,background-color,color] duration-150 ease-toy hover:bg-surface hover:text-ink hover:-translate-x-px hover:-translate-y-px"
        >
          <ChevronLeftIcon className="size-[15px]" />
          ライブラリへ
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-baseline gap-3.5">
        <h1 className="heading flex items-center gap-2 text-[20px]">
          <QualityIcon className="size-[18px] text-brand" />
          整合性チェック
        </h1>
        <span className="ml-auto">
          <RunCheckButton asOf={`${ranAt}/${findings.length}`} onRun={onRun} />
        </span>
      </div>

      {result.storageProblem && (
        <Banner tone="warn" className="mb-3.5">
          {result.storageProblem}
        </Banner>
      )}

      {check && (
        <section className="mb-3.5 rounded-lg bg-surface px-4 py-3.5">
          <SectionHeading>
            <span>最終実行</span>
            <span className="font-code font-medium">{check.ranAt}</span>
          </SectionHeading>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
            <DetailStat
              label="走査したルート"
              value={String(check.rootsWalked)}
            />
            <DetailStat
              label="読んだファイル"
              value={String(check.filesRead)}
            />
            <DetailStat
              label="判定した録画の記録"
              value={String(check.ledgerRowsJudged)}
              unit={`/ ${check.ledgerRowsRead}`}
            />
            <DetailStat
              label="書き込み中で判定せず"
              value={String(check.ledgerRowsStillWriting)}
            />
          </div>
          {(check.rootsOutOfReach > 0 ||
            check.ledgerRowsInRootsOutOfReach > 0) && (
            <p className="mt-2.5 text-note leading-relaxed text-ink-3">
              届かなかったルートが {check.rootsOutOfReach} 件あり、そこにある
              録画の記録 {check.ledgerRowsInRootsOutOfReach}{' '}
              行は判定していません。
            </p>
          )}
        </section>
      )}

      {roots.length > 0 && (
        <section className="mb-3.5 rounded-lg bg-surface px-4 py-3.5">
          <SectionHeading>保存先</SectionHeading>
          {roots.map((root) => (
            <div
              key={root.name}
              className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1 border-b border-dashed border-line py-[9px] text-ui last:border-b-0"
            >
              <b className="font-code text-[13px] font-medium">{root.name}</b>
              {!root.writable && <Badge variant="err">書き込めません</Badge>}
              <span className="text-ink-2">
                空き <span className="font-code">{root.free}</span> / 全体{' '}
                <span className="font-code">{root.total}</span>
              </span>
              {root.recordingsInFlight > 0 && (
                <span className="text-note text-ink-3">
                  進行中の録画 {root.recordingsInFlight} 件
                </span>
              )}
            </div>
          ))}
        </section>
      )}

      {discarded !== undefined && (
        <Banner tone="success" className="mb-3.5">
          {discarded} を削除しました。
        </Banner>
      )}

      {findings.length === 0 ? (
        <EmptyState spot="star" title="食い違いはありません" titleLevel={2} />
      ) : (
        <Table
          className="min-w-[760px]"
          containerClassName="min-h-0 flex-1 overflow-y-auto pb-1"
        >
          <TableHeader className="[&>tr>th]:sticky [&>tr>th]:top-0 [&>tr>th]:z-10">
            <TableRow>
              {COLUMNS.map((column) => (
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
            {findings.map((finding) => (
              <TableRow key={finding.key}>
                <TableCell className="align-top whitespace-normal">
                  <b className="block font-code text-[12px] font-medium break-all">
                    {finding.path}
                  </b>
                  <span className="text-note text-ink-3">{finding.root}</span>
                </TableCell>
                <TableCell className="align-top whitespace-normal">
                  <span
                    className={cn(
                      'text-ui',
                      shapeFor(REASON_TONE, finding.fault, NOT_YET_KNOWN_TONE),
                    )}
                  >
                    {finding.reason}
                  </span>
                </TableCell>
                <TableCell className="align-top text-right">
                  <span className="font-code tabular-nums">{finding.size}</span>
                  {finding.sizeNote && (
                    <small className="block text-[10.5px] text-ink-3">
                      {finding.sizeNote}
                    </small>
                  )}
                </TableCell>
                <TableCell className="align-top text-right font-code tabular-nums text-ink-2">
                  {finding.noticedAt}
                </TableCell>
                <TableCell className="align-top text-right">
                  {OWNED_BY_NO_RECORDING.includes(finding.fault) && (
                    <ActionRow>
                      <Button
                        variant="remove"
                        size="sm"
                        onClick={() => setAsked(finding)}
                      >
                        <TrashIcon />
                        削除
                      </Button>
                    </ActionRow>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <DeleteFindingDialog
        finding={asked}
        onOpenChange={(open) => !open && setAsked(null)}
        onDelete={throwAway}
      />
    </ScreenMain>
  )
}
