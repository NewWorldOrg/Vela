'use client'

import { useCallback, useId, useState, useTransition } from 'react'
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
import { LibraryIcon, SearchIcon } from '@/components/vela/icons'
import {
  FilterFoldButton,
  foldedFiltersOf,
} from '@/components/vela/filter-fold'
import { SegmentedControl } from '@/components/vela/segmented-control'
import { RecordingsTable } from '@/components/library/recordings-table'
import { RecordingSelection } from '@/components/library/recording-selection'
import { ScreenMain } from '@/components/vela/app-shell'
import { iconButtonVariants } from '@/components/vela/icon-button'
import { PhoneBarTools } from '@/components/vela/phone-bar-tools'
import { OnAPhone } from '@/components/vela/on-an-upright-phone'
import { usePhoneOnItsSide } from '@/hooks/usePhone'
import { goesOnFrom } from '@/lib/library-days'
import { useHeldDeletions } from '@/components/recordings/held-deletions'
import {
  PhoneContinue,
  PhoneRecordingRows,
} from '@/components/library/phone-library'

const EVERY_CHANNEL = ''

export function LibraryView({
  result,
  filter,
  onDelete,
  onDeleteAll,
}: {
  result: RecordingsResult
  filter: RecordingsFilter
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
      className="flex flex-col px-3.5 pt-6 pb-6 phone:pt-1 min-[701px]:px-5 min-[1061px]:px-[calc(30rem/16)]"
    >
      <PhoneBarTools>
        {sideways && (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {searchAndFilter}
          </div>
        )}
        <button
          type="button"
          aria-pressed={picking}
          onClick={() => {
            setPicking(!picking)
            setPicked(new Set())
          }}
          className={cn(
            iconButtonVariants(),
            'h-10 w-auto px-4 text-ui font-bold text-ink-2',
            picking && 'border-brand-line bg-brand-soft text-brand',
          )}
        >
          選ぶ
        </button>
      </PhoneBarTools>
      <div className="mb-4 flex flex-wrap items-baseline gap-3.5 phone:hidden">
        <h1 className="heading phone:sr-only flex items-center gap-2 text-[calc(20rem/16)]">
          <LibraryIcon className="size-[calc(18rem/16)] text-brand" />
          ライブラリ
        </h1>
      </div>

      <div
        className={cn(
          'mb-3.5 rounded-lg bg-surface px-4 py-3.5 phone:mb-1 phone:bg-transparent phone:px-0 phone:py-2',
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
        <RecordingsTable
          className="phone:hidden"
          items={items}
          waiting={waiting}
          onDelete={onDelete}
          picked={picked}
          onPick={setPicked}
        />
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
