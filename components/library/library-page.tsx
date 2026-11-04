'use client'

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type Ref,
} from 'react'
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
import {
  PickingBand,
  PickingBar,
  usePickedDeletion,
} from '@/components/library/picking'
import {
  everyShownPicked,
  keepsChoosing,
  pressedPick,
  withEveryShown,
} from '@/lib/library-picking'
import { ScreenMain } from '@/components/vela/app-shell'
import { iconButtonVariants } from '@/components/vela/icon-button'
import { PhoneBarTools } from '@/components/vela/phone-bar-tools'
import { OnAPhone } from '@/components/vela/on-an-upright-phone'
import { usePhoneOnItsSide } from '@/hooks/usePhone'
import { useMouse } from '@/hooks/useMouse'
import { goesOnFrom } from '@/lib/library-days'
import { seriesOf } from '@/lib/library-series'
import {
  LIBRARY_LAYOUT_COOKIE,
  type LibraryView as View,
} from '@/lib/library-view'
import { storeText } from '@/hooks/useStoredText'
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

/** The first of the elements under `root` that `selector` finds and the window draws. */
function drawnIn(
  root: HTMLElement | null,
  selector: string,
): HTMLElement | undefined {
  return [...(root?.querySelectorAll<HTMLElement>(selector) ?? [])].find(
    (one) => one.getClientRects().length > 0,
  )
}

/** The room left at the end of the table, which scrolls inside itself, so the floating bar does not cover its last row. */
const ROOM_FOR_THE_BAR = 'pb-[calc(80rem/16)]'

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
  const pressedBefore = useRef<string | undefined>(undefined)
  const closeRef = useRef<HTMLButtonElement>(null)
  const pickRef = useRef<HTMLButtonElement>(null)
  const pickedOnce = useRef(false)
  const tookOne = useRef(false)
  const startedOn = useRef<string | undefined>(undefined)
  const shelvesRef = useRef<HTMLDivElement>(null)
  const mouse = useMouse()
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
  const shownIds = items.map((one) => one.id)
  const inOrder =
    view.by === 'series'
      ? series.flatMap((one) => one.items.map((r) => r.id))
      : shownIds
  const everyPicked = everyShownPicked(picked, shownIds)
  const stopChoosing = useCallback((): void => {
    setPicking(false)
    setPicked(new Set())
    pressedBefore.current = undefined
    tookOne.current = false
  }, [])
  const deletion = usePickedDeletion(chosen, onDeleteAll, () => {
    setPicked(new Set())
    pressedBefore.current = undefined
  })
  const pickingCards: Picking | undefined = picking
    ? {
        picked,
        onPick: (id, range) => {
          setPicked(
            pressedPick(
              picked,
              inOrder,
              id,
              range ? pressedBefore.current : undefined,
            ),
          )
          pressedBefore.current = id
        },
      }
    : undefined
  const startPickingWith = (id: string): void => {
    startedOn.current = id
    pressedBefore.current = id
    setPicked(new Set([id]))
    setPicking(true)
  }
  const onPickStart = mouse && !picking ? startPickingWith : undefined
  const pickingControls = {
    count: chosen.length,
    everyPicked,
    onEvery: () => setPicked(withEveryShown(picked, shownIds)),
    deletion,
  }

  useEffect(() => {
    if (!picking) {
      return
    }

    tookOne.current ||= chosen.length > 0

    if (!keepsChoosing(chosen.length, tookOne.current)) {
      stopChoosing()
    }
  }, [picking, chosen.length, stopChoosing])

  useEffect(() => {
    const checkOf = (id: string | undefined) =>
      id === undefined
        ? undefined
        : drawnIn(
            shelvesRef.current,
            `[data-recording="${CSS.escape(id)}"] [role="checkbox"]`,
          )

    if (picking) {
      const into = checkOf(startedOn.current) ?? closeRef.current

      pickedOnce.current = true
      into?.focus({ preventScroll: true })
    } else if (pickedOnce.current) {
      const toggle = pickRef.current
      const back =
        toggle && toggle.getClientRects().length > 0
          ? toggle
          : checkOf(startedOn.current)

      back?.focus({ preventScroll: true })
      startedOn.current = undefined
    }
  }, [picking])

  useEffect(() => {
    if (!picking) {
      return
    }

    const leaveOnEscape = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.defaultPrevented) {
        return
      }

      if (
        event.target instanceof Element &&
        event.target.closest(
          '[role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"]',
        )
      ) {
        return
      }

      stopChoosing()
    }

    document.addEventListener('keydown', leaveOnEscape)

    return () => document.removeEventListener('keydown', leaveOnEscape)
  }, [picking, stopChoosing])

  const pickToggleWith = (ref?: Ref<HTMLButtonElement>, className?: string) => (
    <button
      ref={ref}
      type="button"
      aria-pressed={picking}
      onClick={() => {
        if (picking) {
          stopChoosing()
        } else {
          startedOn.current = undefined
          setPicking(true)
        }
      }}
      className={cn(
        iconButtonVariants(),
        'h-10 w-auto px-4 text-ui font-semibold text-ink',
        picking && 'bg-accent-tint text-acc-text hover:bg-accent-tint',
        className,
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
        {pickToggleWith()}
      </PhoneBarTools>
      <div className="phone:hidden">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
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
                href: hrefWith({ as: 'grid' }),
              },
              {
                value: 'table',
                label: '表',
                icon: <RowsIcon />,
                href: hrefWith({ as: 'table' }),
              },
            ]}
            value={view.as}
            onValueChange={(layout) => storeText(LIBRARY_LAYOUT_COOKIE, layout)}
          />
          <div className="ml-auto flex min-w-0 items-center gap-2.5">
            {pickToggleWith(pickRef, 'mouse:hidden')}
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
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-3 phone:hidden">
        <FilterChips
          label="ジャンル"
          options={genres}
          value={filter.genre}
          onChange={(next) => onFiltersChange({ genre: next })}
        />
        <div className="ml-auto flex flex-wrap items-center gap-2">
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
              variant="tone"
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

      {picking && (
        <PickingBand {...pickingControls} className="hidden phone:flex" />
      )}
      <PickingBar
        {...pickingControls}
        shown={picking}
        onClose={stopChoosing}
        closeRef={closeRef}
        className="phone:hidden"
      />
      {deletion.dialog}

      {items.length > 0 && (
        <OnAPhone>
          <div
            data-slot="phone-library"
            className="-mx-3.5 min-h-0 flex-1 overflow-y-auto px-3.5 pb-24"
          >
            <PhoneContinue
              recordings={items.filter(goesOnFrom)}
              dimmed={picking}
            />
            <PhoneRecordingRows
              recordings={items}
              now={new Date()}
              picking={pickingCards}
              onDelete={onDelete}
            />
          </div>
        </OnAPhone>
      )}

      {items.length > 0 ? (
        <div
          ref={shelvesRef}
          data-slot="library-shelves"
          className="-mx-3.5 mt-[calc(22rem/16)] flex min-h-0 flex-1 flex-col gap-[calc(26rem/16)] overflow-y-auto px-3.5 pb-10 phone:hidden min-[701px]:-mx-6 min-[701px]:px-6 min-[1366px]:-mx-10 min-[1366px]:px-10"
        >
          <div
            key={`${view.by}-${view.as}`}
            data-slot="library-view"
            className="screen-hops flex min-h-0 flex-1 flex-col gap-[calc(26rem/16)]"
          >
            {view.as === 'table' ? (
              <>
                {view.by !== 'series' && (
                  <ContinueRow
                    recordings={items.filter(goesOnFrom)}
                    compact
                    dimmed={picking}
                  />
                )}
                <RecordingsTable
                  items={items}
                  groups={view.by === 'series' ? series : undefined}
                  waiting={waiting}
                  onDelete={onDelete}
                  picking={pickingCards}
                  onPickStart={onPickStart}
                  className={cn(picking && ROOM_FOR_THE_BAR)}
                />
              </>
            ) : view.by === 'series' ? (
              <SeriesGrid
                series={series}
                now={now}
                picking={pickingCards}
                onPickStart={onPickStart}
              />
            ) : (
              <>
                <ContinueRow
                  recordings={items.filter(goesOnFrom)}
                  dimmed={picking}
                />
                <DateGrid
                  recordings={items}
                  now={now}
                  picking={pickingCards}
                  onPickStart={onPickStart}
                />
              </>
            )}
            {picking && view.as !== 'table' && (
              <div
                aria-hidden="true"
                data-slot="room-for-the-bar"
                className="h-[calc(80rem/16)] shrink-0"
              />
            )}
          </div>
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
