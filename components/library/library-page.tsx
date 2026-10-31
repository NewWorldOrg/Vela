'use client'

import { useCallback, useId, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { Route } from 'next'

import { addressWith } from '@/lib/path'
import type {
  RecordingBatch,
  RecordingDiscarded,
  RecordingsFilter,
  RecordingsResult,
} from '@/repository/recordings'
import { cn } from '@/lib/utils'
import { RECORDING_STATE_FILTERS } from '@/lib/recordings'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/vela/empty-state'
import { BAND_CONTROL, BAND_PRESS } from '@/components/vela/band'
import { FilterSelect } from '@/components/vela/filter-select'
import { GridIcon, RowsIcon, SearchIcon } from '@/components/vela/icons'
import {
  FilterFoldButton,
  foldedFiltersOf,
} from '@/components/vela/filter-fold'
import { SegmentedControl } from '@/components/vela/segmented-control'
import { FilterChips } from '@/components/vela/filter-chips'
import { RecordingsTable } from '@/components/library/recordings-table'
import { RecordingSelection } from '@/components/library/recording-selection'
import { ScreenMain } from '@/components/vela/app-shell'
import { iconButtonVariants } from '@/components/vela/icon-button'
import { PhoneBarTools } from '@/components/vela/phone-bar-tools'
import { OnAPhone } from '@/components/vela/on-an-upright-phone'
import { usePhoneOnItsSide } from '@/hooks/usePhone'
import { goesOnFrom } from '@/lib/library-days'
import { seriesOf } from '@/lib/library-series'
import type { LibraryView as View } from '@/lib/library-view'
import {
  ContinueRow,
  DateGrid,
  SeriesGrid,
  type Picking,
} from '@/components/library/library-cards'
import { useHeldDeletions } from '@/components/recordings/held-deletions'
import {
  PhoneContinue,
  PhoneRecordingRows,
} from '@/components/library/phone-library'

const EVERY_CHANNEL = ''

const GRID_VIEW: View = { by: 'date', as: 'grid' }

export function LibraryView({
  result,
  filter,
  view = GRID_VIEW,
  onDelete,
  onDeleteAll,
}: {
  result: RecordingsResult
  filter: RecordingsFilter
  view?: View
  onDelete: (id: string) => Promise<RecordingDiscarded>
  onDeleteAll: (ids: string[]) => Promise<RecordingBatch>
}) {
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set())
  const [picking, setPicking] = useState(false)
  const held = useHeldDeletions()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const sideways = usePhoneOnItsSide()
  const filtersId = useId()
  const router = useRouter()
  const [waiting, startWaiting] = useTransition()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const onFiltersChange = useCallback(
    (patch: Record<string, string | null>) => {
      setPicked(new Set())
      startWaiting(() =>
        router.replace(
          addressWith(pathname, searchParams.toString(), patch) as Route,
          { scroll: false },
        ),
      )
    },
    [router, pathname, searchParams],
  )
  const { total, channels, years, genres } = result
  const items = result.items.filter((one) => !held.has(one.id))
  const chosen = items.filter((one) => picked.has(one.id))
  const narrowed = [filter.year, filter.genre, filter.state, filter.ch].filter(
    Boolean,
  ).length
  const hasFilter = Boolean(filter.q) || narrowed > 0
  const foldedOnAPhone = foldedFiltersOf(filtersOpen, 'handheld')
  const clearEveryCondition = (): void =>
    onFiltersChange({
      q: null,
      year: null,
      genre: null,
      state: null,
      ch: null,
    })

  const hrefWith = (patch: Record<string, string | null>) =>
    addressWith(pathname, searchParams.toString(), patch) as Route
  const series = useMemo(() => seriesOf(items), [items])
  const now = new Date()
  const pickingCards: Picking | undefined = picking
    ? {
        picked,
        onPick: (id, taken) => {
          const next = new Set(picked)

          if (taken) {
            next.add(id)
          } else {
            next.delete(id)
          }

          setPicked(next)
        },
      }
    : undefined
  const pickToggle = (
    <button
      type="button"
      aria-pressed={picking}
      onClick={() => {
        setPicking(!picking)
        setPicked(new Set())
      }}
      className={cn(
        iconButtonVariants(),
        'h-10 w-auto px-4 text-ui font-semibold text-ink',
        picking && 'bg-btn text-on-ink hover:bg-btn',
      )}
    >
      選ぶ
    </button>
  )

  const searchAndFilter = (
    <>
      <form
        className="relative min-w-0 flex-1"
        onSubmit={(e) => {
          e.preventDefault()
          const q = new FormData(e.currentTarget).get('q')
          onFiltersChange({ q: typeof q === 'string' ? q : null })
        }}
      >
        <SearchIcon className="pointer-events-none absolute top-1/2 left-[calc(13rem/16)] z-10 size-[calc(15rem/16)] -translate-y-1/2 text-ink-2" />
        <Input
          key={filter.q ?? ''}
          name="q"
          defaultValue={filter.q ?? ''}
          placeholder="番組名・概要・出演者で検索"
          className={cn(
            BAND_CONTROL,
            'rounded-full pl-[calc(34rem/16)] text-ellipsis',
          )}
        />
      </form>
      <FilterFoldButton
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        controls={filtersId}
        narrowed={narrowed}
        on="handheld"
      />
    </>
  )

  return (
    <ScreenMain
      scroll="within"
      className="flex flex-col px-3.5 pt-3.5 phone:pt-1 phone:pb-6 min-[701px]:px-6 min-[1366px]:px-10"
    >
      <PhoneBarTools>
        {sideways && (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {searchAndFilter}
          </div>
        )}
        {pickToggle}
      </PhoneBarTools>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 phone:hidden">
        <h1 className="text-display font-bold tracking-[-0.03em] text-ink">
          ライブラリ
        </h1>
        <span className="mt-2.5 mr-2.5 text-sub whitespace-nowrap text-ink-2">
          {hasFilter ? (
            <>
              <span className="font-code">{items.length}</span> /{' '}
              <span className="font-code">{total}</span> 件
            </>
          ) : (
            <>
              <span className="font-code">{total}</span> 件
            </>
          )}
        </span>
        <SegmentedControl
          aria-label="まとめ方"
          options={[
            { value: 'date', label: '日付', href: hrefWith({ by: null }) },
            {
              value: 'series',
              label: 'シリーズ',
              href: hrefWith({ by: 'series' }),
            },
          ]}
          value={view.by}
        />
        <SegmentedControl
          aria-label="並べ方"
          options={[
            {
              value: 'grid',
              label: '格子',
              icon: <GridIcon />,
              href: hrefWith({ as: null }),
            },
            {
              value: 'table',
              label: '表',
              icon: <RowsIcon />,
              href: hrefWith({ as: 'table' }),
            },
          ]}
          value={view.as}
        />
        <div className="ml-auto flex min-w-0 items-center gap-2.5">
          {pickToggle}
          <form
            role="search"
            className="relative w-[calc(320rem/16)] min-w-0 max-[999px]:w-[calc(240rem/16)]"
            onSubmit={(e) => {
              e.preventDefault()
              const q = new FormData(e.currentTarget).get('q')
              onFiltersChange({ q: typeof q === 'string' ? q : null })
            }}
          >
            <SearchIcon className="pointer-events-none absolute top-1/2 left-4 z-10 size-4 -translate-y-1/2 text-ink-3" />
            <Input
              key={filter.q ?? ''}
              name="q"
              aria-label="録画を検索"
              defaultValue={filter.q ?? ''}
              placeholder="番組名・概要・出演者で検索"
              className="h-10 rounded-full border-0 pl-10 text-body text-ellipsis"
            />
          </form>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-3 phone:hidden">
        <FilterChips
          label="ジャンル"
          options={genres}
          value={filter.genre}
          onChange={(next) => onFiltersChange({ genre: next })}
        />
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <FilterSelect
            quiet
            label="期間"
            value={filter.year}
            options={years.map((y) => ({
              value: String(y),
              label: `${y} 年`,
            }))}
            onChange={(next) => onFiltersChange({ year: next })}
          />
          <FilterSelect
            quiet
            label="状態"
            value={filter.state}
            options={RECORDING_STATE_FILTERS.map((f) => ({
              value: f,
              label: f,
            }))}
            onChange={(next) => onFiltersChange({ state: next })}
          />
          <FilterSelect
            quiet
            label="チャンネル"
            value={filter.ch}
            options={channels.map((ch) => ({ value: ch, label: ch }))}
            onChange={(next) => onFiltersChange({ ch: next })}
          />
          {hasFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-1"
              onClick={clearEveryCondition}
            >
              条件を解除
            </Button>
          )}
        </div>
      </div>

      <div
        className={cn(
          'hidden phone:mb-1 phone:block phone:py-2',
          !filtersOpen && 'sideways:hidden',
        )}
      >
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-3">
          <div className="flex min-w-[calc(180rem/16)] flex-[1_1_100%] items-center gap-2.5 min-[701px]:flex-[0_1_268px] sideways:hidden">
            {searchAndFilter}
          </div>
          <div id={filtersId} className={cn('contents', foldedOnAPhone)}>
            <FilterSelect
              label="期間"
              value={filter.year}
              options={years.map((y) => ({
                value: String(y),
                label: `${y} 年`,
              }))}
              onChange={(next) => onFiltersChange({ year: next })}
            />
            <FilterSelect
              label="ジャンル"
              value={filter.genre}
              options={genres.map((g) => ({ value: g, label: g }))}
              onChange={(next) => onFiltersChange({ genre: next })}
            />
            <FilterSelect
              label="状態"
              value={filter.state}
              options={RECORDING_STATE_FILTERS.map((f) => ({
                value: f,
                label: f,
              }))}
              onChange={(next) => onFiltersChange({ state: next })}
            />
            <span className="ml-auto text-sub whitespace-nowrap text-ink-2 max-[900px]:ml-0">
              {hasFilter ? (
                <>
                  該当{' '}
                  <b className="font-code font-medium text-ink">
                    {items.length}
                  </b>{' '}
                  件 / 全{' '}
                  <b className="font-code font-medium text-ink">{total}</b> 件
                </>
              ) : (
                <>
                  全 <b className="font-code font-medium text-ink">{total}</b>{' '}
                  件
                </>
              )}
            </span>
            {hasFilter && (
              <Button variant="tone" size="sm" onClick={clearEveryCondition}>
                条件を解除
              </Button>
            )}
          </div>
        </div>
        <div
          className={cn(
            'mt-3 border-t border-dashed border-line pt-3',
            foldedOnAPhone,
          )}
        >
          <SegmentedControl
            size="band"
            label="チャンネル"
            options={[
              { value: EVERY_CHANNEL, label: 'すべて' },
              ...channels.map((ch) => ({ value: ch, label: ch })),
            ]}
            value={filter.ch ?? EVERY_CHANNEL}
            onValueChange={(next) =>
              onFiltersChange({ ch: next === EVERY_CHANNEL ? null : next })
            }
          />
        </div>
      </div>

      {chosen.length > 0 && (
        <RecordingSelection
          chosen={chosen}
          onClear={() => setPicked(new Set())}
          onDeleteAll={onDeleteAll}
          className="phone:fixed phone:inset-x-3 phone:bottom-[calc(var(--tab-bar-cover)+10rem/16)] phone:z-50 phone:mb-0 phone:shadow-pop-lg sideways:left-[calc(80rem/16+env(safe-area-inset-left))]"
        />
      )}

      {items.length > 0 && (
        <OnAPhone>
          <div
            data-slot="phone-library"
            className="-mx-3.5 min-h-0 flex-1 overflow-y-auto px-3.5 pb-24"
          >
            <PhoneContinue recordings={items.filter(goesOnFrom)} />
            <PhoneRecordingRows
              recordings={items}
              now={new Date()}
              picking={picking}
              picked={picked}
              onPick={setPicked}
              onDelete={onDelete}
            />
          </div>
        </OnAPhone>
      )}

      {items.length > 0 ? (
        <div
          data-slot="library-shelves"
          className="-mx-3.5 mt-[calc(22rem/16)] flex min-h-0 flex-1 flex-col gap-[calc(26rem/16)] overflow-y-auto px-3.5 pb-10 phone:hidden min-[701px]:-mx-6 min-[701px]:px-6 min-[1366px]:-mx-10 min-[1366px]:px-10"
        >
          {view.as === 'table' ? (
            <RecordingsTable
              items={items}
              groups={view.by === 'series' ? series : undefined}
              waiting={waiting}
              onDelete={onDelete}
              picking={picking}
              picked={picked}
              onPick={setPicked}
            />
          ) : view.by === 'series' ? (
            <SeriesGrid series={series} now={now} picking={pickingCards} />
          ) : (
            <>
              <ContinueRow recordings={items.filter(goesOnFrom)} />
              <DateGrid recordings={items} now={now} picking={pickingCards} />
            </>
          )}
        </div>
      ) : hasFilter ? (
        <EmptyState
          title="条件に合う録画がありません"
          titleLevel={2}
          className="mt-10 max-w-[calc(560rem/16)]"
          action={
            <div className="flex flex-wrap justify-center gap-2.5">
              <Button variant="tone" size="sm" onClick={clearEveryCondition}>
                条件を解除
              </Button>
              {filter.q &&
                (filter.year || filter.genre || filter.state || filter.ch) && (
                  <Button
                    variant="tone"
                    size="sm"
                    onClick={() =>
                      onFiltersChange({
                        year: null,
                        genre: null,
                        state: null,
                        ch: null,
                      })
                    }
                  >
                    キーワード以外を解除
                  </Button>
                )}
            </div>
          }
        />
      ) : (
        <EmptyState
          title="まだ録画がありません"
          titleLevel={2}
          className="mt-10 max-w-[calc(560rem/16)]"
          action={
            <div className="flex flex-wrap justify-center gap-2.5">
              <Button variant="tone" size="sm" asChild>
                <Link href="/guide">番組表へ</Link>
              </Button>
              <Button variant="tone" size="sm" asChild>
                <Link href="/reservations">予約へ</Link>
              </Button>
            </div>
          }
        />
      )}
    </ScreenMain>
  )
}
