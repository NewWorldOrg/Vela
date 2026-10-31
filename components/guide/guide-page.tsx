'use client'

import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { addressWith } from '@/lib/path'
import { foldedGuideOf, foldsAColumn, isOnAir } from '@/lib/guide'
import { cn } from '@/lib/utils'
import { useSubChannelsFolded } from '@/hooks/useSubChannelsFolded'
import { CHANNEL_KINDS } from '@/repository/channels'
import type {
  CollectNowResult,
  CollectScope,
  CollectionStatus,
  RebuildResult,
} from '@/repository/collection'
import type { GuideResult, Program, ProgramExtras } from '@/repository/programs'
import type {
  ReservationRevision,
  ReservationWrite,
} from '@/repository/reservations'
import { Button } from '@/components/ui/button'
import { Banner } from '@/components/vela/banner'
import { EmptyState } from '@/components/vela/empty-state'
import { BAND_CONTROL, BAND_PRESS } from '@/components/vela/band'
import { pressable } from '@/components/vela/tactile'
import {
  PhoneBarButton,
  PhoneBarLead,
  PhoneBarLink,
  PhoneBarTools,
} from '@/components/vela/phone-bar-tools'
import { OnAPhone } from '@/components/vela/on-an-upright-phone'
import { ReserveCircle } from '@/components/guide/reserve-circle'
import { SegmentedControl } from '@/components/vela/segmented-control'
import { SubChannelToggle } from '@/components/vela/sub-channel-toggle'
import {
  AntennaIcon,
  ChevronDownIcon,
  FilterIcon,
  SearchIcon,
} from '@/components/vela/icons'
import { CollectionDrawer } from '@/components/guide/collection-drawer'
import { GuideGrid } from '@/components/guide/guide-grid'
import { hourPxIn } from '@/components/guide/guide-metrics'
import { glyphLoadsOf } from '@/lib/arrival'
import { ProgramPanel } from '@/components/guide/program-panel'
import { ProgramBooking } from '@/components/guide/program-booking'
import { ProgramDetailBody } from '@/components/guide/program-detail'
import { ChannelStrip } from '@/components/guide/channel-strip'
import { ChannelDayList } from '@/components/guide/channel-day-list'
import { usePhoneUpright } from '@/hooks/usePhone'
import { ScreenMain } from '@/components/vela/app-shell'
import {
  FilterFoldButton,
  foldedFiltersOf,
} from '@/components/vela/filter-fold'

export function GuideView({
  guide,
  collection,
  onCollectNow,
  onRebuild,
  onReserve,
  onCancel,
  onRestore,
  onRevise,
  onReadExtras,
  subChannelsFolded = false,
}: {
  /** Puts back a reservation the circle took back, from the toast's `元に戻す`. */
  onRestore?: (id: string) => Promise<ReservationWrite>
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
  onReadExtras: (
    kind: string,
    date: string,
    id: string,
    channelId: string,
  ) => Promise<ProgramExtras | undefined>
  subChannelsFolded?: boolean
}) {
  const router = useRouter()
  const [, startWaiting] = useTransition()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [selected, setSelected] = useState<Program | null>(null)
  const [folded, fold] = useSubChannelsFolded(subChannelsFolded)
  const foldable = useMemo(
    () => foldsAColumn(guide.channels, guide.programs),
    [guide.channels, guide.programs],
  )
  const foldedGuide = useMemo(
    () => foldedGuideOf(guide.channels, guide.programs),
    [guide.channels, guide.programs],
  )
  const shownGuide = folded && foldable ? foldedGuide : guide
  const glyphLoads = useMemo(
    () =>
      glyphLoadsOf(
        [
          ...guide.channels.map((c) => c.name),
          ...guide.programs.flatMap((p) => [
            p.title,
            p.genreLabel,
            p.description ?? '',
          ]),
        ],
        guide.programs.map((p) => p.title),
      ),
    [guide.channels, guide.programs],
  )

  const shown = selected
    ? (shownGuide.programs.find(
        (one) => one.id === selected.id && one.channelId === selected.channelId,
      ) ?? selected)
    : null
  const [panelOpen, setPanelOpen] = useState(false)
  const [collectionOpen, setCollectionOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [daysOpen, setDaysOpen] = useState(false)
  const phone = usePhoneUpright()
  const [listedId, setListedId] = useState<string>()
  const listed =
    shownGuide.channels.find((c) => c.id === listedId) ?? shownGuide.channels[0]
  const listedPrograms = useMemo(
    () =>
      shownGuide.programs
        .filter((p) => p.channelId === listed?.id)
        .sort((a, b) => a.startMin - b.startMin),
    [shownGuide.programs, listed?.id],
  )
  const toolsId = useId()
  const daysId = useId()
  const narrowed =
    (guide.kind === 'terrestrial' ? 0 : 1) + (foldable && folded ? 1 : 0)
  const foldedOnAPhone = foldedFiltersOf(toolsOpen, 'handheld')

  const [extras, setExtras] = useState<
    Record<string, ProgramExtras | 'failed'>
  >({})
  const asked = useRef(new Set<string>())
  const extrasKeyOf = useCallback(
    (program: Program) =>
      [guide.kind, guide.day.date, program.channelId, program.id].join('|'),
    [guide.kind, guide.day.date],
  )

  const select = useCallback(
    (program: Program) => {
      setSelected(program)
      setPanelOpen(true)

      const key = extrasKeyOf(program)

      if (program.items !== undefined || asked.current.has(key)) {
        return
      }

      const failed = (): void => {
        asked.current.delete(key)
        setExtras((was) => ({ ...was, [key]: 'failed' }))
      }

      asked.current.add(key)
      setExtras((was) => {
        const { [key]: _, ...rest } = was

        return rest
      })
      onReadExtras(guide.kind, guide.day.date, program.id, program.channelId)
        .then((found) => {
          if (found === undefined) {
            failed()

            return
          }

          setExtras((was) => ({ ...was, [key]: found }))
        })
        .catch(failed)
    },
    [extrasKeyOf, onReadExtras, guide.kind, guide.day.date],
  )

  const patch = useCallback(
    (next: Record<string, string | null>) => {
      startWaiting(() =>
        router.replace(
          addressWith(pathname, searchParams.toString(), next) as Route,
          { scroll: false },
        ),
      )
    },
    [router, pathname, searchParams],
  )

  const loaded = shown ? extras[extrasKeyOf(shown)] : undefined
  const detailed =
    shown && typeof loaded === 'object' ? { ...shown, ...loaded } : shown
  const extrasState =
    !shown || shown.items !== undefined || typeof loaded === 'object'
      ? undefined
      : loaded === 'failed'
        ? 'failed'
        : 'waiting'

  const reserving = useMemo(
    () => ({ onReserve, onCancel, onRestore }),
    [onReserve, onCancel, onRestore],
  )
  const circleOf = (program: Program) => (
    <ReserveCircle
      programmeId={program.id}
      title={program.title}
      booking={program.booking}
      onReserve={onReserve}
      onCancel={onCancel}
      onRestore={onRestore}
    />
  )
  const detailOf = (program: Program) => {
    const read = detailed && detailed.id === program.id ? detailed : program

    return (
      <ProgramDetailBody
        program={read}
        extras={
          detailed?.id === program.id ? (extrasState ?? 'ready') : 'ready'
        }
        channel={listed}
        dayLabel={guide.day.label}
        onAir={isOnAir(program, guide.nowMin)}
        onReserve={onReserve}
        reservation={
          read.booking && (
            <ProgramBooking
              booking={read.booking}
              title={read.title}
              channel={listed}
              onCancel={onCancel}
              onRevise={onRevise}
            />
          )
        }
      />
    )
  }
  return (
    <ScreenMain
      width="full"
      scroll="within"
      className="flex flex-col px-3.5 pt-3.5 pb-4 min-[701px]:px-6 min-[1366px]:px-10 upright:pt-0.5 upright:pb-0 sideways:px-3 sideways:pt-0 sideways:pb-0"
    >
      <h1 className="sr-only">番組表</h1>
      <div
        data-slot="guide-tools"
        className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 phone:hidden"
      >
        <SegmentedControl
          aria-label="放送の種別"
          options={CHANNEL_KINDS}
          value={guide.kind}
          onValueChange={(next) =>
            patch({ kind: next === 'terrestrial' ? null : next })
          }
        />
        <ul aria-label="日" className="flex items-center gap-0.5">
          {guide.days.map((day) => {
            const [date, weekday] = dayPartsOf(day.label)

            return (
              <li key={day.date}>
                <button
                  type="button"
                  aria-pressed={day.date === guide.day.date}
                  onClick={() => patch({ date: day.isToday ? null : day.date })}
                  className={cn(
                    'tap-target flex h-10 items-baseline gap-1 rounded-full px-2.5 pt-[calc(9rem/16)] font-code text-title font-bold whitespace-nowrap text-ink-2 outline-none transition-[background-color,color] duration-[140ms] ease-toy hover:text-ink focus-visible:shadow-ring',
                    pressable,
                    day.date === guide.day.date && 'bg-surface text-ink',
                  )}
                >
                  {date}
                  {weekday && (
                    <span className="text-note font-medium">{weekday}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
        <span aria-hidden="true" className="h-6 w-px bg-hair" />
        <div role="group" aria-label="時刻へ送る" className="flex items-center">
          {JUMPS.map((jump) => (
            <button
              key={jump.label}
              type="button"
              onClick={() =>
                jump.label === '今' && !guide.day.isToday
                  ? patch({ date: null })
                  : scrollGuideTo(
                      jump.label === '今'
                        ? guide.nowMin === undefined
                          ? undefined
                          : guide.nowMin - 30
                        : (jump.hour - guide.windowStartHour) * 60,
                    )
              }
              className={cn(
                'tap-target flex h-9 min-w-11 items-center justify-center rounded-full px-2.5 text-ui font-semibold text-ink outline-none transition-[background-color] duration-[140ms] ease-toy hover:bg-surface focus-visible:shadow-ring',
                pressable,
              )}
            >
              {jump.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {foldable && (
            <SubChannelToggle
              shown={!folded}
              onShownChange={(on) => fold(!on)}
            />
          )}
          <button
            type="button"
            data-opens="collection"
            onClick={() => setCollectionOpen(true)}
            className={cn(BAND_PRESS, 'h-9')}
          >
            <AntennaIcon />
            収集状態
          </button>
        </div>
      </div>
      <PhoneBarLead>
        <button
          type="button"
          aria-expanded={daysOpen}
          aria-controls={daysId}
          onClick={() => setDaysOpen(!daysOpen)}
          className={cn(
            'heading flex h-11 min-w-0 items-center gap-1 rounded-full text-section whitespace-nowrap outline-none focus-visible:shadow-ring',
            pressable,
          )}
        >
          {guide.day.isToday && (
            <span className="mr-1 rounded-full bg-brand-soft px-2 py-px font-body text-note font-bold text-brand">
              今日
            </span>
          )}
          <span className="truncate">{guide.day.label}</span>
          <span className="sr-only">日を選ぶ</span>
          <ChevronDownIcon
            className={cn(
              'size-[calc(18rem/16)] shrink-0 text-ink-2 transition-transform',
              daysOpen && 'rotate-180',
            )}
          />
        </button>
        {!guide.day.isToday && (
          <button
            type="button"
            onClick={() => {
              setDaysOpen(false)
              patch({ date: null })
            }}
            className={cn(
              'tap-target ml-1.5 shrink-0 rounded-full bg-brand-soft px-2.5 py-0.5 text-note font-bold text-brand outline-none focus-visible:shadow-ring',
              pressable,
            )}
          >
            今日
          </button>
        )}
      </PhoneBarLead>
      <PhoneBarTools>
        <PhoneBarLink href="/search" aria-label="番組を検索">
          <SearchIcon />
        </PhoneBarLink>
        <PhoneBarButton
          aria-label="絞り込み"
          aria-expanded={toolsOpen}
          aria-controls={toolsId}
          open={toolsOpen}
          count={narrowed}
          onClick={() => setToolsOpen(!toolsOpen)}
        >
          <FilterIcon />
        </PhoneBarButton>
      </PhoneBarTools>
      {daysOpen && (
        <OnAPhone>
          <ul
            id={daysId}
            aria-label="日"
            data-slot="phone-days"
            className="-mx-3.5 mb-2.5 flex gap-2 overflow-x-auto px-4 pb-1 sideways:-mx-5 sideways:px-5"
          >
            {guide.days.map((day) => (
              <li key={day.date} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={day.date === guide.day.date}
                  onClick={() => {
                    setDaysOpen(false)
                    patch({ date: day.isToday ? null : day.date })
                  }}
                  className={cn(
                    BAND_PRESS,
                    BAND_CONTROL,
                    'h-11 font-code',
                    day.date === guide.day.date &&
                      'border-brand-line bg-brand-soft font-bold text-brand',
                  )}
                >
                  {day.isToday ? '今日' : day.label}
                </button>
              </li>
            ))}
          </ul>
        </OnAPhone>
      )}
      <div
        className={cn(
          'hidden flex-wrap items-center gap-x-2.5 gap-y-3 rounded-lg bg-surface px-3.5 py-2.5 sideways:py-2',
          toolsOpen && 'phone:mb-2.5 phone:flex',
        )}
      >
        <FilterFoldButton
          open={toolsOpen}
          onOpenChange={setToolsOpen}
          controls={toolsId}
          narrowed={narrowed}
          on="handheld"
          className="ml-auto phone:hidden sideways:hidden"
        />

        <div
          id={toolsId}
          className={cn(
            'contents max-[600px]:flex max-[600px]:w-full max-[600px]:flex-wrap max-[600px]:items-center max-[600px]:gap-2.5 max-[600px]:border-t max-[600px]:border-dashed max-[600px]:border-line max-[600px]:pt-3 sideways:flex sideways:w-full sideways:flex-wrap sideways:items-center sideways:gap-2.5 phone:border-t-0 phone:pt-0',
            foldedOnAPhone,
          )}
        >
          <SegmentedControl
            aria-label="放送の種別"
            className="-order-1 max-[600px]:order-none sideways:order-none"
            options={CHANNEL_KINDS}
            value={guide.kind}
            onValueChange={(next) =>
              patch({ kind: next === 'terrestrial' ? null : next })
            }
          />

          {foldable && (
            <SubChannelToggle
              shown={!folded}
              onShownChange={(on) => fold(!on)}
            />
          )}

          <button
            type="button"
            data-opens="collection"
            onClick={() => setCollectionOpen(true)}
            className={cn(BAND_PRESS, BAND_CONTROL, 'ml-auto max-[700px]:ml-0')}
          >
            <AntennaIcon />
            収集状態
          </button>
        </div>
      </div>

      {guide.health && (
        <Banner
          tone={guide.health.tone}
          className="mb-3"
          data-opens="collection"
          actions={[
            {
              label: '収集状態へ',
              onClick: () => setCollectionOpen(true),
            },
          ]}
        >
          {guide.health.facts.map((fact) => (
            <p key={fact.subject} data-health-fact={fact.subject}>
              <b className="font-bold">{fact.emphasis}</b>
              {fact.detail}
            </p>
          ))}
        </Banner>
      )}

      {shownGuide.channels.length === 0 ? (
        <EmptyState
          titleLevel={2}
          title={`${CHANNEL_KINDS.find((k) => k.value === guide.kind)?.label} の番組情報が不足しています(カバレッジ ${guide.coverageDays ?? 0} 日)`}
          action={
            <Button variant="tone" size="sm" asChild>
              <Link href="/settings/channels">チャンネルへ</Link>
            </Button>
          }
        />
      ) : shownGuide.programs.length === 0 ? (
        <EmptyState titleLevel={2} title="この日の番組情報がありません" />
      ) : (
        <>
          {listed && (
            <div
              data-guide-phone
              className="hidden min-h-0 flex-1 flex-col upright:flex"
            >
              <ChannelStrip
                channels={shownGuide.channels}
                shown={new Set([listed.id])}
                onPick={(c) => {
                  setListedId(c.id)
                  setPanelOpen(false)
                }}
                className="mb-2.5"
              />
              <ChannelDayList
                channelId={listed.id}
                dayKey={guide.day.date}
                programs={listedPrograms}
                nowMin={guide.nowMin}
                nowLabel={guide.nowLabel}
                openId={phone && panelOpen ? selected?.id : undefined}
                circleOf={circleOf}
                onToggle={(program) =>
                  panelOpen && selected?.id === program.id
                    ? setPanelOpen(false)
                    : select(program)
                }
                detailOf={detailOf}
              />
            </div>
          )}
          {!phone && (
            <div className="flex min-h-0 flex-1 flex-col upright:hidden">
              <GuideGrid
                key={guide.kind}
                channels={shownGuide.channels}
                programs={shownGuide.programs}
                dayKey={guide.day.date}
                windowStartHour={guide.windowStartHour}
                windowHours={guide.windowHours}
                nowMin={guide.nowMin}
                nowLabel={guide.nowLabel}
                selectedId={panelOpen ? selected?.id : undefined}
                onSelect={select}
                glyphLoads={glyphLoads}
                reserving={reserving}
              />
            </div>
          )}
          {shown && !phone && (
            <ProgramPanel
              program={detailed ?? shown}
              extras={extrasState}
              channel={shownGuide.channels.find(
                (c) => c.id === shown.channelId,
              )}
              dayLabel={guide.day.label}
              onAir={isOnAir(shown, guide.nowMin)}
              open={panelOpen}
              onClose={() => setPanelOpen(false)}
              onReserve={onReserve}
              onCancel={onCancel}
              onRevise={onRevise}
            />
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

const JUMPS = [
  { label: '今', hour: 0 },
  { label: '朝', hour: 6 },
  { label: '昼', hour: 12 },
  { label: '夜', hour: 19 },
  { label: '深夜', hour: 23 },
] as const

/** A day's label cut into its date and its day of the week: 8/8(金) is 8/8 and 金. */
function dayPartsOf(label: string): [string, string | undefined] {
  const parts = label.match(/^(.*)\((.)\)$/u)

  return parts ? [parts[1], parts[2]] : [label, undefined]
}

/** Sends the guide to a minute of its day, that minute at the top under the channels' heads. */
function scrollGuideTo(minute: number | undefined): void {
  const scroller = document.querySelector<HTMLElement>('[data-guide-scroll]')

  if (!scroller || minute === undefined) {
    return
  }

  scroller.scrollTo({
    top: Math.max(0, (minute / 60) * hourPxIn(document)),
    behavior:
      document.documentElement.dataset.motion === 'still' ? 'auto' : 'smooth',
  })
}
