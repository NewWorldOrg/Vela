'use client'

import { useEffect, useId, useState, useTransition } from 'react'
import Link from 'next/link'

import { useDismissable } from '@/hooks/useDismissable'
import { streamLabel } from '@/lib/collection'
import { cn } from '@/lib/utils'
import type {
  CollectNowResult,
  CollectScope,
  CollectionStatus,
  RebuildResult,
  StreamVisitRow,
} from '@/repository/collection'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IconButton } from '@/components/vela/icon-button'
import {
  AntennaIcon,
  ClockIcon,
  CloseIcon,
  CollectIcon,
  ListIcon,
  RebuildIcon,
  SuccessIcon,
  WarningIcon,
} from '@/components/vela/icons'
import { SegmentedControl } from '@/components/vela/segmented-control'
import { ChipDot } from '@/components/vela/status'
import { RebuildEpgDialog } from '@/components/guide/rebuild-dialog'

type CollectRange = 'all' | 'stream' | 'service'

const RANGE_OPTIONS = [
  { value: 'all', label: '全体' },
  { value: 'stream', label: 'TS 指定' },
  { value: 'service', label: 'サービス指定' },
]

const OUTCOME_LABEL: Record<StreamVisitRow['outcome'], string> = {
  neverVisited: '未収集',
  complete: 'Complete',
  basicOnly: 'BasicOnly',
  incomplete: 'Incomplete',
  interrupted: '中断',
  noLock: '選局失敗',
  noBytes: '選局失敗',
}

function SectionCap({
  icon: CapIcon,
  children,
  stat,
}: {
  icon: typeof ClockIcon
  children: React.ReactNode
  stat?: React.ReactNode
}) {
  return (
    <div className="mt-4 mb-2 flex items-center gap-[7px] text-sub font-bold text-ink-2">
      <CapIcon className="size-3.5 text-brand" />
      {children}
      {stat !== undefined && (
        <span className="ml-auto text-note font-normal text-ink-3 tabular-nums">
          {stat}
        </span>
      )}
    </div>
  )
}

function StreamName({ row }: { row: StreamVisitRow }) {
  return (
    <>
      <span className="font-code text-[12px] font-medium whitespace-nowrap text-ink-2 tabular-nums">
        {streamLabel(row)}
        {row.channelLabel ? `(${row.channelLabel})` : ''}
      </span>
      <span className="min-w-0 flex-1 text-sub font-bold">
        {row.name ?? '—'}
        <small className="ml-1.5 text-cap font-normal whitespace-nowrap text-ink-3">
          サービス {row.serviceCount}
        </small>
      </span>
    </>
  )
}

function OutcomeChip({ outcome }: { outcome: StreamVisitRow['outcome'] }) {
  const variant =
    outcome === 'complete'
      ? 'ok'
      : outcome === 'basicOnly'
        ? 'sky'
        : outcome === 'incomplete'
          ? 'err'
          : 'mute'

  return (
    <Badge variant={variant}>
      <ChipDot />
      {OUTCOME_LABEL[outcome]}
    </Badge>
  )
}

function Figure({ children }: { children: React.ReactNode }) {
  return <span className="font-code text-ink tabular-nums">{children}</span>
}

function VisitDetail({ row }: { row: StreamVisitRow }) {
  if (row.outcome === 'noLock' || row.outcome === 'noBytes') {
    return (
      <>
        <span>
          {row.outcome === 'noLock' ? '信号を掴めない' : 'データが来ない'}
        </span>
      </>
    )
  }

  if (row.outcome === 'interrupted') {
    return (
      <>
        <span>収集中に中断されました</span>
      </>
    )
  }

  if (row.outcome === 'neverVisited') {
    return <span className="text-ink-3">まだ訪問していません</span>
  }

  if (row.outcome === 'incomplete') {
    return (
      <>
        <span className="font-bold text-lemon">収集不調</span>
        <span>
          連続 <Figure>{row.consecutiveIncomplete}</Figure> 回
        </span>
        {row.durationLabel && (
          <span>
            前回 <Figure>{row.durationLabel}</Figure>で打ち切り
          </span>
        )}
        {row.notBeforeLabel && (
          <span>
            次の訪問 <Figure>{row.notBeforeLabel}</Figure> 以降
          </span>
        )}
      </>
    )
  }

  return (
    <>
      {row.lastCompletedLabel && (
        <span>
          最終完了 <Figure>{row.lastCompletedLabel}</Figure>
        </span>
      )}
      {row.durationLabel && (
        <span>
          所要 <Figure>{row.durationLabel}</Figure>
        </span>
      )}
      {row.outcome === 'basicOnly' && (
        <span className="text-ink-3">extended は次回持ち越し</span>
      )}
    </>
  )
}

function LatestVisit({ status }: { status: CollectionStatus }) {
  const rows = status.streams

  if (rows.length > 0 && rows.every((row) => row.outcome === 'complete')) {
    return (
      <div className="flex items-start gap-[11px] rounded-xl bg-surface-2 px-3.5 py-3">
        <span className="relative mt-0.5 shrink-0">
          <AntennaIcon className="size-[30px] text-mint" strokeWidth={1.5} />
          <SuccessIcon className="absolute -right-1 -bottom-0.5 size-3.5 text-mint" />
        </span>
        <div className="min-w-0">
          <b className="block text-sub font-bold text-mint">
            巡回は完了しています
          </b>
          <span className="block text-note leading-[1.7] text-ink-2">
            全 <Figure>{rows.length}</Figure> TS が Complete。
          </span>
        </div>
      </div>
    )
  }

  const latest = rows
    .filter((row) => row.lastAttemptedAt !== undefined)
    .sort((a, b) => (a.lastAttemptedAt! < b.lastAttemptedAt! ? 1 : -1))[0]

  if (!latest) {
    return (
      <div className="rounded-xl bg-surface-2 px-3.5 py-3 text-note leading-[1.7] text-ink-2">
        まだどの TS も訪問していません。
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-surface-2 px-3.5 py-3">
      <b className="block text-sub font-bold">
        最終訪問 —{' '}
        <span className="font-code font-medium tabular-nums">
          {streamLabel(latest)}
          {latest.channelLabel ? `(${latest.channelLabel})` : ''}
        </span>
        {latest.name}
      </b>
      <span className="mt-0.5 flex flex-wrap gap-x-3.5 text-note leading-[1.7] text-ink-2">
        <span>
          結果 {OUTCOME_LABEL[latest.outcome]}
          {latest.lastAttemptedLabel && (
            <>
              ・<Figure>{latest.lastAttemptedLabel}</Figure>
            </>
          )}
        </span>
      </span>
    </div>
  )
}

function CollectOutcomeLine({ outcome }: { outcome: CollectNowResult }) {
  if (outcome.state === 'started') {
    return (
      <p className="mt-2 flex items-start gap-2 text-sub leading-[1.7] text-mint">
        <SuccessIcon className="mt-[3px] size-[15px] shrink-0" />
        <span>
          いますぐ集めるを受け付けました(
          <Figure>{outcome.streams}</Figure> TS)。
        </span>
      </p>
    )
  }

  const body =
    outcome.state === 'running' ? (
      <span>
        <b className="block font-bold">
          実行中のブーストが 1 本あります(同時に 1 本まで)。
        </b>
      </span>
    ) : outcome.state === 'cooldown' ? (
      <span>
        <b className="block font-bold">
          前回のブーストから間隔が空いていません。
        </b>
        {outcome.notBeforeLabel ? (
          <>
            <span className="font-code tabular-nums">
              {outcome.notBeforeLabel}
            </span>{' '}
            以降にもう一度押せます。
          </>
        ) : (
          '間隔を置いてもう一度押せます。'
        )}
      </span>
    ) : outcome.state === 'missing' ? (
      <span>
        <b className="block font-bold">
          指定した対象は巡回の対象にありません。
        </b>
      </span>
    ) : outcome.state === 'unauthenticated' ? (
      <span>サインインが切れているため、受け付けられませんでした。</span>
    ) : (
      <span>{outcome.message}</span>
    )

  return (
    <div className="mt-2 flex items-start gap-2 rounded-xl bg-lemon-soft px-[13px] py-2.5 text-sub leading-[1.7] text-lemon">
      <WarningIcon className="mt-[3px] size-[15px] shrink-0" />
      <div className="min-w-0">{body}</div>
    </div>
  )
}

/**
 * The screen-side view of the visit ledger: what the collector did per
 * transport stream, the way to bring a visit forward, and the gate to the one
 * destructive operation. The API answers for a press — the drawer shows the
 * refusal and its reason rather than guessing at the collector's state.
 */
export function CollectionDrawer({
  status,
  open,
  onClose,
  onCollectNow,
  onRebuild,
}: {
  status: CollectionStatus
  open: boolean
  onClose: () => void
  onCollectNow: (scope: CollectScope) => Promise<CollectNowResult>
  onRebuild: () => Promise<RebuildResult>
}) {
  const [pending, startTransition] = useTransition()
  const [range, setRange] = useState<CollectRange>('all')
  const [streamKey, setStreamKey] = useState<string>()
  const [serviceKey, setServiceKey] = useState<string>()
  const [outcome, setOutcome] = useState<CollectNowResult>()
  const [rebuildOpen, setRebuildOpen] = useState(false)
  const [discarded, setDiscarded] = useState<number>()
  const [cooldownUntil, setCooldownUntil] = useState<number>()
  const guardId = useId()
  const drawer = useDismissable<HTMLDivElement>({
    open,
    onDismiss: onClose,
    opener: 'collection',
  })

  useEffect(() => {
    if (cooldownUntil === undefined) {
      return
    }

    const timer = setTimeout(
      () => {
        setCooldownUntil(undefined)
        setOutcome(undefined)
      },
      Math.max(0, cooldownUntil - Date.now()),
    )

    return () => clearTimeout(timer)
  }, [cooldownUntil])

  const targets =
    range === 'stream'
      ? status.streamTargets
      : range === 'service'
        ? status.serviceTargets
        : []
  const targetKey = range === 'stream' ? streamKey : serviceKey
  const target = targets.find((option) => option.value === targetKey)
  const runnable = range === 'all' || target !== undefined
  const coolingDown = cooldownUntil !== undefined

  const run = () =>
    startTransition(async () => {
      setOutcome(undefined)

      const answered = await onCollectNow(
        range === 'all'
          ? {}
          : {
              networkId: target?.networkId,
              transportStreamId: target?.transportStreamId,
              serviceId: target?.serviceId,
            },
      )

      setOutcome(answered)

      if (answered.state === 'cooldown' && answered.notBefore !== undefined) {
        const until = Date.parse(answered.notBefore)

        if (until > Date.now()) {
          setCooldownUntil(until)
        }
      }
    })

  const troubled = status.troubledCount

  return (
    <>
      <div
        ref={drawer}
        tabIndex={-1}
        role="dialog"
        aria-label="収集状態"
        aria-hidden={!open}
        inert={!open}
        data-cursor-shut={!open ? 'the drawer is shut' : undefined}
        className={cn(
          'fixed top-[60px] right-[18px] bottom-[18px] z-[45] flex w-[500px] flex-col overflow-hidden rounded-xl border border-line-strong bg-surface shadow-pop-xl outline-none transition-transform duration-200 ease-toy',
          'max-[1060px]:w-[440px]',
          'max-[900px]:top-auto max-[900px]:right-3 max-[900px]:bottom-3 max-[900px]:left-3 max-[900px]:max-h-[70vh] max-[900px]:w-auto',
          !open &&
            'translate-x-[calc(100%+30px)] max-[900px]:translate-x-0 max-[900px]:translate-y-[calc(100%+30px)]',
        )}
      >
        <div className="flex items-center gap-2.5 px-5 pt-4">
          <AntennaIcon className="size-[18px] text-brand" />
          <h2 className="heading min-w-0 flex-1 text-[16px]">収集状態</h2>
          <IconButton
            aria-label="閉じる"
            variant="quiet"
            size="sm"
            onClick={onClose}
          >
            <CloseIcon />
          </IconButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-1.5 pb-[18px]">
          <SectionCap icon={ClockIcon}>現在の収集</SectionCap>
          <LatestVisit status={status} />

          <SectionCap icon={CollectIcon}>いますぐ集める</SectionCap>
          <div className="flex flex-wrap items-center gap-x-[9px] gap-y-2">
            <span className="text-note font-bold whitespace-nowrap text-ink-3">
              集める範囲
            </span>
            <SegmentedControl
              aria-label="集める範囲"
              options={RANGE_OPTIONS}
              value={range}
              onValueChange={(next) => setRange(next as CollectRange)}
            />
          </div>
          {range !== 'all' && (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-[9px] gap-y-2">
              <span className="text-note font-bold whitespace-nowrap text-ink-3">
                対象
              </span>
              <Select
                value={targetKey ?? ''}
                onValueChange={
                  range === 'stream' ? setStreamKey : setServiceKey
                }
              >
                <SelectTrigger
                  size="sm"
                  aria-label="対象"
                  className="min-w-0 max-w-full"
                >
                  <SelectValue placeholder="対象を選ぶ" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {targets.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="mt-2.5 flex flex-wrap items-start gap-3">
            <Button
              size="sm"
              disabled={pending || !runnable || coolingDown}
              aria-describedby={coolingDown ? guardId : undefined}
              onClick={run}
            >
              <AntennaIcon />
              いますぐ集める
            </Button>
            {coolingDown && (
              <p className="min-w-[180px] flex-1 text-note leading-[1.7] text-ink-3">
                終わってから、間隔を置いてもう一度押せます。
              </p>
            )}
          </div>
          <span aria-live="polite" id={guardId}>
            {outcome && <CollectOutcomeLine outcome={outcome} />}
          </span>

          <SectionCap
            icon={ListIcon}
            stat={
              <>
                {status.kindCounts
                  .map((entry) => `${entry.label} ${entry.count} TS`)
                  .join(' / ')}
                {troubled > 0 && ` / 不調 ${troubled}`}
              </>
            }
          >
            TS ごとの訪問記録
          </SectionCap>
          <div>
            {status.streams.map((row) => (
              <div
                key={row.key}
                className="border-b border-dashed border-line px-0.5 py-2.5 last:border-b-0"
              >
                <div className="flex flex-wrap items-center gap-[9px]">
                  <StreamName row={row} />
                  <OutcomeChip outcome={row.outcome} />
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3.5 gap-y-0 pl-0.5 text-note leading-[1.7] text-ink-2">
                  <VisitDetail row={row} />
                </div>
              </div>
            ))}
            {status.streams.length === 0 && (
              <p className="py-2.5 text-note leading-[1.7] text-ink-3">
                訪問記録はまだありません。
              </p>
            )}
          </div>

          {status.zeroServiceKinds.length > 0 && (
            <div className="mt-3 flex items-start gap-[9px] text-sub leading-[1.7] text-ink-2">
              <WarningIcon className="mt-[3px] size-[15px] shrink-0 text-lemon" />
              <div>
                {status.zeroServiceKinds.map((kind) => kind.label).join(' / ')}{' '}
                — サービス <Figure>0</Figure> 件。{' '}
                <Link
                  href="/settings/tuners"
                  className="tap-target font-bold whitespace-nowrap underline underline-offset-[3px]"
                >
                  チューナーへ
                </Link>
              </div>
            </div>
          )}

          <div className="mt-3.5 flex flex-wrap items-center gap-3 border-t border-dashed border-line pt-[13px]">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setRebuildOpen(true)}
            >
              <RebuildIcon />
              EPG 全破棄 → 再構築
            </Button>
          </div>
          <span aria-live="polite">
            {discarded !== undefined && (
              <p className="mt-2 flex items-start gap-2 text-sub leading-[1.7] text-mint">
                <SuccessIcon className="mt-[3px] size-[15px] shrink-0" />
                <span>
                  番組表のデータを破棄しました(
                  <Figure>{discarded}</Figure> 件)。
                </span>
              </p>
            )}
          </span>
        </div>
      </div>

      <RebuildEpgDialog
        open={rebuildOpen}
        onOpenChange={setRebuildOpen}
        kindCounts={status.kindCounts}
        onRebuild={onRebuild}
        onDiscarded={setDiscarded}
      />
    </>
  )
}
