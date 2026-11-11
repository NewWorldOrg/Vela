'use client'

import type { ReactElement } from 'react'
import { useCallback, useId, useState, useTransition } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { usePathname, useRouter } from 'next/navigation'

import {
  newRuleHref,
  ruleNarrowsAnything,
  ruleTermsOfSearch,
} from '@/lib/rules'
import { cn } from '@/lib/utils'
import type { Noticing } from '@/lib/notifications'
import type { SearchOutcome, SearchResult } from '@/repository/search'
import {
  EMPTY_SEARCH_CONDITION,
  SEARCH_PER_PAGE_OPTIONS,
  SEARCH_SORT_OPTIONS,
  searchQueryOf,
  searchTermsOf,
  searchTermsQueryOf,
  searchViewingOf,
} from '@/repository/search-options'
import type {
  SearchCondition,
  SearchSort,
  SearchTerms,
  SearchViewing,
} from '@/repository/search-options'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { EmptyState } from '@/components/vela/empty-state'
import {
  WAITING_LABEL,
  WaitingRows,
  waitsWhile,
} from '@/components/vela/waiting'
import { IconButton } from '@/components/vela/icon-button'
import { Pager } from '@/components/vela/pager'
import {
  ChevronLeftIcon,
  CloseIcon,
  LinkIcon,
  SearchIcon,
} from '@/components/vela/icons'
import { ScreenMain } from '@/components/vela/screen-main'
import type { ReservationWrite } from '@/repository/reservations'
import { pressable } from '@/components/vela/tactile'
import { PhoneBarLead } from '@/components/vela/phone-bar-lead'
import { OnAnUprightPhone } from '@/components/vela/on-an-upright-phone'
import { PhoneSearchHits } from '@/components/search/phone-search-hits'
import { HitDetail } from '@/components/search/hit-detail'
import { SearchHits } from '@/components/search/search-hits'
import { ConditionChips } from '@/components/search/condition-chips'
import {
  draftOf,
  termsOf,
  type SearchDraft,
} from '@/components/search/search-draft'
import { SidewaysPanes } from '@/components/vela/sideways-panes'
import { useToast } from '@/components/vela/toast'
import { usePhoneOnItsSide } from '@/hooks/usePhone'

function insteadOfHits(
  waiting: boolean,
  outcome: SearchOutcome,
): ReactElement | null {
  if (waiting && outcome.state !== 'searched') {
    return <WaitingRows rows={6} className="mt-6" aria-label={WAITING_LABEL} />
  }

  if (outcome.state === 'idle') {
    return (
      <EmptyState
        title="まだ検索結果がありません"
        titleLevel={2}
        className="mt-10 max-w-[calc(560rem/16)]"
      />
    )
  }

  if (outcome.state === 'refused') {
    return (
      <EmptyState
        title="この条件では検索できません"
        titleLevel={2}
        className="mt-10 max-w-[calc(560rem/16)]"
      >
        {outcome.message}
      </EmptyState>
    )
  }

  return null
}

interface Reserving {
  /** Reserves a hit in one press, from the phone's circle. */
  onReserve?: (programmeId: string) => Promise<ReservationWrite>
  /** Takes back a hit's reservation, from the circle or the toast. */
  onCancel?: (id: string) => Promise<ReservationWrite>
  /** Puts back a reservation the circle took back. */
  onRestore?: (id: string) => Promise<ReservationWrite>
  /** Asks for a notice when a hit starts, and takes one back, from the detail beside the list. */
  noticing?: Noticing
}

export function SearchView({
  result,
  ...reserving
}: Reserving & { result: SearchResult }) {
  return (
    <SearchScreen
      key={searchTermsQueryOf(result.condition)}
      result={result}
      {...reserving}
    />
  )
}

/** A choice of how the hits are shown, as a chip on its own ground: what it is set to and its arrow. */
const QUIET_CHOICE =
  'h-8 w-fit gap-1 rounded-full bg-surface pr-2.5 pl-3 text-ui font-medium text-ink transition-[background-color,transform] duration-[140ms] ease-toy enabled:hover:bg-surface-2 enabled:active:scale-[0.98] [&_svg]:size-3.5'

function SearchScreen({
  result,
  onReserve,
  onCancel,
  onRestore,
  noticing,
}: Reserving & { result: SearchResult }) {
  const sideways = usePhoneOnItsSide()
  const [chosenId, choose] = useState<string>()
  const formId = useId()
  const router = useRouter()
  const pathname = usePathname()
  const say = useToast()
  const { condition, channels, outcome } = result

  const [draft, setDraft] = useState<SearchDraft>(() =>
    draftOf(searchTermsOf(condition)),
  )

  const [waiting, startWaiting] = useTransition()

  const go = useCallback(
    (next: SearchCondition, push = false) => {
      const written = searchQueryOf(next)
      const href = (written ? `${pathname}?${written}` : pathname) as Route
      const navigate = push ? router.push : router.replace

      startWaiting(() => navigate(href, { scroll: false }))
    },
    [router, pathname],
  )

  const askingOf = (terms: SearchTerms): SearchCondition => ({
    ...terms,
    ...searchViewingOf(condition),
    page: 1,
  })

  const amend = (part: Partial<SearchDraft>): void =>
    setDraft((previous) => ({ ...previous, ...part }))

  const settle = (part: Partial<SearchDraft> = {}): void => {
    const next = { ...draft, ...part }
    const terms = termsOf(next)

    setDraft(next)

    if (
      searchTermsQueryOf(terms) !== searchTermsQueryOf(searchTermsOf(condition))
    ) {
      go(askingOf(terms), true)
    }
  }

  const show = (part: Partial<SearchViewing>, push = false): void =>
    go({ ...condition, ...part }, push)

  const clear = (): void => {
    setDraft(draftOf(searchTermsOf(EMPTY_SEARCH_CONDITION)))
    go(EMPTY_SEARCH_CONDITION)
  }

  const terms: SearchTerms = termsOf(draft)
  const asking = askingOf(terms)
  const found = outcome.state === 'searched' ? outcome.found : undefined
  const instead = insteadOfHits(waiting, outcome)
  const written: string = searchQueryOf(asking)
  const href: string = written ? `${pathname}?${written}` : pathname
  const narrowing: boolean = ruleNarrowsAnything(ruleTermsOfSearch(terms))
  const ruleHref = newRuleHref(terms)
  const words = (found ? condition.q : undefined)?.split(/\s+/) ?? []
  const chosen =
    found?.hits.find((hit) => hit.id === chosenId) ?? found?.hits[0]

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${href}`)
      say({ text: 'コピーしました' })
    } catch {
      say({ text: 'コピーできません' })
    }
  }

  const conditions = (place: string) => (
    <ConditionChips
      draft={draft}
      channels={channels}
      amend={amend}
      settle={settle}
      formId={formId}
      clear={written !== '' ? clear : undefined}
      className={place}
    />
  )

  const clearWords = draft.q !== '' && (
    <button
      type="button"
      aria-label="キーワードを消す"
      onClick={() => amend({ q: '' })}
      className={cn(
        'tap-target flex size-[calc(22rem/16)] shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2 outline-none focus-visible:shadow-ring [&_svg]:size-3',
        pressable,
      )}
    >
      <CloseIcon />
    </button>
  )

  return (
    <ScreenMain
      width="reading"
      className="px-3.5 pt-3.5 pb-16 min-[701px]:px-6 min-[1366px]:px-10 upright:pt-0.5 sideways:pt-0"
    >
      <PhoneBarLead>
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-surface pr-2 pl-3.5 text-ink-2 focus-within:shadow-ring sideways:max-w-[calc(240rem/16)] sideways:shrink-0">
          <SearchIcon className="size-4 shrink-0" />
          <input
            form={formId}
            type="search"
            enterKeyHint="search"
            aria-label="キーワード"
            autoFocus={outcome.state === 'idle'}
            value={draft.q}
            onChange={(event) => amend({ q: event.target.value })}
            className="h-full min-w-0 flex-1 bg-transparent text-body text-ink caret-accent outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {clearWords}
        </label>
        {sideways &&
          conditions(
            'min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [mask-image:linear-gradient(to_right,#000_88%,transparent)]',
          )}
      </PhoneBarLead>
      <OnAnUprightPhone>
        {conditions(
          '-mx-3.5 mb-2 overflow-x-auto px-3.5 pt-0.5 pb-1 [scrollbar-width:none]',
        )}
      </OnAnUprightPhone>

      <h1 className="sr-only">番組検索</h1>
      <form
        id={formId}
        role="search"
        className="mt-2 flex items-center gap-3.5 phone:hidden"
        // WebKit lets the Enter that settles an IME conversion submit the form; Chromium and Gecko hold it back themselves.
        onKeyDown={(event) => {
          if (event.key === 'Enter' && event.nativeEvent.isComposing) {
            event.preventDefault()
          }
        }}
        onSubmit={(event) => {
          event.preventDefault()
          go(asking, true)
        }}
      >
        <Link
          href="/guide"
          aria-label="番組表へ"
          className={cn(
            'tap-target flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-ink outline-none hover:bg-surface-2 focus-visible:shadow-ring [&_svg]:size-4',
            pressable,
          )}
        >
          <ChevronLeftIcon />
        </Link>
        <label className="flex h-[calc(52rem/16)] max-w-[calc(760rem/16)] min-w-0 flex-1 items-center gap-2.5 rounded-full bg-surface pr-3.5 pl-5 text-ink-2 transition-shadow duration-[140ms] ease-toy focus-within:shadow-[0_0_0_2px_var(--bg),0_0_0_4px_var(--ink)]">
          <SearchIcon className="size-5 shrink-0" />
          <input
            type="search"
            enterKeyHint="search"
            aria-label="キーワード"
            autoFocus={outcome.state === 'idle'}
            value={draft.q}
            onChange={(event) => amend({ q: event.target.value })}
            className="h-full min-w-0 flex-1 bg-transparent text-heading text-ink caret-accent outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {clearWords}
        </label>
        <button type="submit" hidden>
          検索
        </button>
      </form>
      {conditions('mt-4 flex-wrap phone:hidden')}

      <div className="mt-[calc(22rem/16)] flex max-w-[calc(1180rem/16)] flex-wrap items-center gap-x-2 gap-y-2 phone:hidden">
        {found && (
          <span className="mr-2 text-ui text-ink-2 tabular-nums">
            {found.total} 件
            {found.lastPage > 1 && (
              <>
                {' '}
                / {found.rangeFrom}–{found.rangeTo} 件目
              </>
            )}
          </span>
        )}
        {found && found.hits.length > 0 && (
          <>
            <Select
              value={condition.sort}
              onValueChange={(value) =>
                show({ sort: value as SearchSort, page: 1 })
              }
            >
              <SelectTrigger
                size="sm"
                aria-label="並び替え"
                className={QUIET_CHOICE}
              >
                {
                  SEARCH_SORT_OPTIONS.find((o) => o.value === condition.sort)
                    ?.label
                }
              </SelectTrigger>
              <SelectContent>
                {SEARCH_SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(condition.perPage)}
              onValueChange={(value) =>
                show({ perPage: Number(value), page: 1 })
              }
            >
              <SelectTrigger
                size="sm"
                aria-label="表示件数"
                className={QUIET_CHOICE}
              >
                {condition.perPage} 件ずつ
              </SelectTrigger>
              <SelectContent>
                {SEARCH_PER_PAGE_OPTIONS.map((count) => (
                  <SelectItem key={count} value={String(count)}>
                    {count} 件ずつ
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          <IconButton
            aria-label="この条件の URL をコピー"
            title="この条件の URL をコピー"
            className="size-10"
            onClick={() => void copy()}
          >
            <LinkIcon />
          </IconButton>
          {narrowing ? (
            <Button variant="tone" asChild>
              <Link href={ruleHref}>この条件でルールを作成</Link>
            </Button>
          ) : (
            <Button
              variant="tone"
              disabled
              title="キーワード・除外キーワード・ジャンル・サブジャンル・種別・チャンネル・曜日・期間のどれも指定していないため、ルールを作成できません。"
            >
              この条件でルールを作成
            </Button>
          )}
        </div>
      </div>

      {instead ??
        (found && (
          <div
            {...waitsWhile(waiting)}
            className={cn(
              waitsWhile(waiting).className,
              'mt-5 phone:mt-0 sideways:flex sideways:min-h-0 sideways:flex-1 sideways:flex-col',
            )}
          >
            <h2 className="sr-only">検索結果</h2>
            {found.hits.length === 0 ? (
              <EmptyState
                title="条件に合う番組がありません"
                className="mt-6 max-w-[calc(560rem/16)]"
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button size="sm" variant="tone" onClick={clear}>
                      条件を解除
                    </Button>
                    <Button size="sm" variant="tone" asChild>
                      <Link href="/guide">番組表へ</Link>
                    </Button>
                  </div>
                }
              />
            ) : (
              <>
                {sideways && (
                  <SidewaysPanes
                    detailLabel="番組の詳細"
                    list={
                      <>
                        <PhoneSearchHits
                          hits={found.hits}
                          total={found.total}
                          words={words}
                          ruleHref={narrowing ? ruleHref : undefined}
                          onReserve={onReserve}
                          onCancel={onCancel}
                          onRestore={onRestore}
                          chosenId={chosen?.id}
                          onChoose={(hit) => choose(hit.id)}
                          className="mx-0"
                        />
                        {found.lastPage > 1 && (
                          <Pager
                            total={found.total}
                            page={found.page}
                            lastPage={found.lastPage}
                            onPage={(page) => show({ page }, true)}
                            className="mx-4 my-3"
                          />
                        )}
                      </>
                    }
                    detail={
                      chosen && (
                        <HitDetail
                          hit={chosen}
                          words={words}
                          onReserve={onReserve}
                          noticing={noticing}
                        />
                      )
                    }
                  />
                )}
                <OnAnUprightPhone>
                  <PhoneSearchHits
                    hits={found.hits}
                    total={found.total}
                    words={words}
                    ruleHref={narrowing ? ruleHref : undefined}
                    onReserve={onReserve}
                    onCancel={onCancel}
                    onRestore={onRestore}
                  />
                </OnAnUprightPhone>
                <div className="phone:hidden">
                  <SearchHits
                    hits={found.hits}
                    words={words}
                    onReserve={onReserve}
                    onCancel={onCancel}
                    onRestore={onRestore}
                  />
                </div>
                <Pager
                  total={found.total}
                  page={found.page}
                  lastPage={found.lastPage}
                  onPage={(page) => show({ page }, true)}
                  className={cn(
                    'mt-6 max-w-[calc(1180rem/16)] upright:mt-4 sideways:hidden',
                    found.lastPage <= 1 && 'hidden',
                  )}
                />
              </>
            )}
          </div>
        ))}
    </ScreenMain>
  )
}
