'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { cn } from '@/lib/utils'
import { CHANNEL_KINDS } from '@/repository/channels'
import type {
  CollectNowResult,
  CollectScope,
  CollectionStatus,
  RebuildResult,
} from '@/repository/collection'
import type { GuideResult, Program } from '@/repository/programs'
import type {
  ReservationRevision,
  ReservationWrite,
} from '@/repository/reservations'
import { Button } from '@/components/ui/button'
import { Banner } from '@/components/vela/banner'
import { EmptyState } from '@/components/vela/empty-state'
import { IconButton } from '@/components/vela/icon-button'
import {
  AntennaIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
} from '@/components/vela/icons'
import { CollectionDrawer } from '@/components/guide/collection-drawer'
import { GuideGrid } from '@/components/guide/guide-grid'
import { ProgramPanel } from '@/components/guide/program-panel'
import { ScreenMain } from '@/components/vela/app-shell'

export function GuideView({
  guide,
  collection,
  onCollectNow,
  onRebuild,
  onReserve,
  onCancel,
  onRevise,
}: {
  guide: GuideResult
  collection: CollectionStatus
  onCollectNow: (scope: CollectScope) => Promise<CollectNowResult>
  onRebuild: () => Promise<RebuildResult>
  onReserve: (programmeId: string) => Promise<ReservationWrite>
  onCancel: (id: string) => Promise<ReservationWrite>
  onRevise: (
    id: string,
    revision: ReservationRevision,
  ) => Promise<ReservationWrite>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [selected, setSelected] = useState<Program | null>(null)
  /**
   * The panel shows the programme as the guide now has it, not as it was when
   * it was picked: a reservation taken or dropped from inside the panel
   * changes the row it was opened from.
   */
  const shown = selected
    ? (guide.programs.find((one) => one.id === selected.id) ?? selected)
    : null
  const [panelOpen, setPanelOpen] = useState(false)
  const [collectionOpen, setCollectionOpen] = useState(false)

  const select = useCallback((program: Program) => {
    setSelected(program)
    setPanelOpen(true)
  }, [])

  const patch = useCallback(
    (next: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(next)) {
        if (v == null) {
          params.delete(k)
        } else {
          params.set(k, v)
        }
      }
      const qs = params.toString()
      router.replace((qs ? `${pathname}?${qs}` : pathname) as Route, {
        scroll: false,
      })
    },
    [router, pathname, searchParams],
  )

  const dayIndex = guide.days.findIndex((d) => d.date === guide.day.date)
  const prev = guide.days[dayIndex - 1]
  const next = guide.days[dayIndex + 1]

  return (
    <ScreenMain
      width="full"
      scroll="within"
      className="flex flex-col px-3.5 pt-4 pb-4 min-[701px]:px-5 min-[1061px]:px-[30px]"
    >
      <div className="mb-3 flex flex-wrap items-center gap-3.5 rounded-lg bg-surface px-[18px] py-[9px] max-[700px]:px-3.5">
        <div className="inline-flex gap-1 rounded-full bg-surface-2 p-[3px]">
          {CHANNEL_KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              aria-pressed={k.value === guide.kind}
              onClick={() =>
                patch({ kind: k.value === 'terrestrial' ? null : k.value })
              }
              className={cn(
                'tap-target cursor-pointer rounded-full border-none bg-transparent px-3 py-1 text-sub font-medium whitespace-nowrap text-ink-2 transition-[background-color,color] duration-150 hover:bg-surface hover:text-ink',
                k.value === guide.kind && 'bg-brand-soft font-bold text-brand',
              )}
            >
              {k.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <IconButton
            aria-label="前の日"
            size="sm"
            disabled={!prev}
            onClick={() => prev && patch({ date: prev.date })}
          >
            <ChevronLeftIcon />
          </IconButton>
          <span className="min-w-[7em] text-center font-code text-ui font-medium">
            {guide.day.label}
          </span>
          <IconButton
            aria-label="次の日"
            size="sm"
            disabled={!next}
            onClick={() => next && patch({ date: next.date })}
          >
            <ChevronRightIcon />
          </IconButton>
          {!guide.day.isToday && (
            <button
              type="button"
              onClick={() => patch({ date: null })}
              className="tap-target cursor-pointer rounded-full border border-edge bg-surface px-3 py-1 text-sub font-medium whitespace-nowrap text-ink-2 shadow-pop transition-[translate,box-shadow] duration-150 ease-toy hover:-translate-x-px hover:-translate-y-px hover:text-ink hover:shadow-pop-lg"
            >
              今日
            </button>
          )}
        </div>

        <button
          type="button"
          data-opens="collection"
          onClick={() => setCollectionOpen(true)}
          className="tap-target ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-edge bg-surface px-3.5 py-1.5 text-sub font-medium whitespace-nowrap text-ink-2 shadow-pop transition-[translate,box-shadow,color] duration-150 ease-toy hover:-translate-x-px hover:-translate-y-px hover:text-ink hover:shadow-pop-lg max-[700px]:ml-0"
        >
          <AntennaIcon className="size-[15px]" />
          収集状態
        </button>
        <Link
          href="/search"
          className="tap-target inline-flex items-center gap-1.5 rounded-full border border-edge bg-surface px-3.5 py-1.5 text-sub font-medium whitespace-nowrap text-ink-2 shadow-pop transition-[translate,box-shadow,color] duration-150 ease-toy hover:-translate-x-px hover:-translate-y-px hover:text-ink hover:shadow-pop-lg"
        >
          <SearchIcon className="size-[15px]" />
          番組を検索
        </Link>
      </div>

      {guide.coverageWarning && (
        <Banner
          tone="warn"
          className="mb-3"
          data-opens="collection"
          actions={[
            {
              label: '収集状態を見る',
              onClick: () => setCollectionOpen(true),
            },
          ]}
        >
          <b className="block font-bold">{guide.coverageWarning.emphasis}</b>
          {guide.coverageWarning.body}
        </Banner>
      )}

      {guide.channels.length === 0 ? (
        <EmptyState
          spot="antenna"
          title={`${CHANNEL_KINDS.find((k) => k.value === guide.kind)?.label} の番組情報が不足しています(カバレッジ 0 日)`}
          action={
            <Button variant="default" size="sm" asChild>
              <Link href="/settings/channels">チャンネル設定へ</Link>
            </Button>
          }
        >
          チャンネル設定を確認してください。
        </EmptyState>
      ) : guide.programs.length === 0 ? (
        <EmptyState spot="antenna" title="この日の番組情報がありません">
          {guide.day.label}{' '}
          の番組情報がまだ取れていません。取得できた日から順に並びます。
        </EmptyState>
      ) : (
        <>
          <GuideGrid
            channels={guide.channels}
            programs={guide.programs}
            windowStartHour={guide.windowStartHour}
            windowHours={guide.windowHours}
            nowMin={guide.nowMin}
            nowLabel={guide.nowLabel}
            selectedId={panelOpen ? selected?.id : undefined}
            onSelect={select}
          />
          {shown && (
            <ProgramPanel
              program={shown}
              channel={guide.channels.find((c) => c.id === shown.channelId)}
              dayLabel={guide.day.label}
              open={panelOpen}
              onClose={() => setPanelOpen(false)}
              onReserve={onReserve}
              onCancel={onCancel}
              onRevise={onRevise}
            />
          )}
          {selected && !panelOpen && (
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              className="tap-target fixed right-[18px] bottom-[18px] z-30 cursor-pointer rounded-full border border-edge bg-surface px-[17px] py-2 text-ui font-bold whitespace-nowrap text-ink shadow-pop transition-[translate,box-shadow] duration-150 ease-toy hover:-translate-x-px hover:-translate-y-px hover:shadow-pop-lg active:translate-x-px active:translate-y-px active:shadow-pop-none max-[900px]:right-3 max-[900px]:bottom-3"
            >
              番組詳細を開く
            </button>
          )}
        </>
      )}

      <CollectionDrawer
        status={collection}
        open={collectionOpen}
        onClose={() => setCollectionOpen(false)}
        onCollectNow={onCollectNow}
        onRebuild={onRebuild}
      />
    </ScreenMain>
  )
}
