'use client'

import type { ReactElement, ReactNode } from 'react'
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
import type {
  SearchHits,
  SearchOutcome,
  SearchResult,
} from '@/repository/search'
import {
  EMPTY_SEARCH_CONDITION,
  SEARCH_FIELD_OPTIONS,
  SEARCH_GENRE_OPTIONS,
  SEARCH_KIND_OPTIONS,
  SEARCH_MOST_CHANNELS,
  SEARCH_PER_PAGE_OPTIONS,
  SEARCH_SORT_OPTIONS,
  genreLabelOf,
  namesSomeDays,
  searchQueryOf,
  searchTermsOf,
  searchTermsQueryOf,
  searchViewingOf,
} from '@/repository/search-options'
import type {
  SearchCondition,
  SearchField,
  SearchGenre,
  SearchKind,
  SearchSort,
  SearchTerms,
  SearchViewing,
} from '@/repository/search-options'
import { Badge } from '@/components/ui/badge'
import { TableHead } from '@/components/ui/table'
import { cardPlace, READABLE_LINE } from '@/components/ui/table-cards'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { InFull } from '@/components/vela/in-full'
import { Pager } from '@/components/vela/pager'
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  FilterIcon,
  LinkIcon,
  ListIcon,
  PlusIcon,
  SearchIcon,
} from '@/components/vela/icons'
import { ADMIN_LIST_HEIGHT_CAP, ScreenMain } from '@/components/vela/app-shell'
import { ChannelMark } from '@/components/vela/channel-mark'
import {
  DayPicks,
  Pick,
  SubgenrePicks,
} from '@/components/search/condition-picks'
import { SPAN_DASH } from '@/lib/format'
import type { ReservationWrite } from '@/repository/reservations'
import { BAND_CONTROL, BAND_PRESS } from '@/components/vela/band'
import { pressable } from '@/components/vela/tactile'
import { PhoneBarLead } from '@/components/vela/phone-bar-tools'
import { OnAnUprightPhone } from '@/components/vela/on-an-upright-phone'
import { PhoneSearchHits } from '@/components/search/phone-search-hits'
import { WHEN_LABELS } from '@/lib/when-terms'

const EVERY_KIND = 'all'

const GENRE_CLASS: Record<string, string> = {
  news: 'bg-genre-news border-genre-news-line',
  sports: 'bg-genre-sports border-genre-sports-line',
  info: 'bg-genre-info border-genre-info-line',
  drama: 'bg-genre-drama border-genre-drama-line',
  music: 'bg-genre-music border-genre-music-line',
  variety: 'bg-genre-variety border-genre-variety-line',
  movie: 'bg-genre-movie border-genre-movie-line',
  anime: 'bg-genre-anime border-genre-anime-line',
  doc: 'bg-genre-doc border-genre-doc-line',
  other: 'bg-genre-other border-genre-other-line',
}

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
        className="mt-10 max-w-[calc(560rem/16)]"
      />
    )
  }

  if (outcome.state === 'refused') {
    return (
      <EmptyState
        title="この条件では検索できません"
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

/** The conditions a phone opens one at a time from the row of chips under the field. */
type PhoneCondition = 'kind' | 'genre' | 'days' | 'channels' | 'fields'

const PHONE_CONDITION_SHOWN: Record<PhoneCondition, string> = {
  kind: 'upright:[&_[data-condition=kind]]:flex',
  genre: 'upright:[&_[data-condition=genre]]:flex',
  days: 'upright:[&_[data-condition=days]]:flex',
  channels: 'upright:[&_[data-condition=channels]]:flex',
  fields: 'upright:[&_[data-condition=fields]]:flex',
}

function SearchScreen({
  result,
  onReserve,
  onCancel,
  onRestore,
}: Reserving & { result: SearchResult }) {
  const [phoneCondition, setPhoneCondition] = useState<PhoneCondition>()
  const formId = useId()
  const router = useRouter()
  const pathname = usePathname()
  const [copied, setCopied] = useState<{ href: string; ok: boolean } | null>(
    null,
  )
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

  const amend = (part: Partial<SearchDraft>): void =>
    setDraft((previous) => ({ ...previous, ...part }))

  const show = (part: Partial<SearchViewing>, push = false): void =>
    go({ ...condition, ...part }, push)

  const clear = (): void => {
    setDraft(draftOf(searchTermsOf(EMPTY_SEARCH_CONDITION)))
    go(EMPTY_SEARCH_CONDITION)
  }

  const terms: SearchTerms = termsOf(draft)

  const asking: SearchCondition = {
    ...terms,
    ...searchViewingOf(condition),
    page: 1,
  }

  const askedCount: number = [
    Boolean(terms.q),
    Boolean(terms.exclude),
    terms.genres.length > 0,
    terms.subgenres.length > 0,
    Boolean(terms.kind),
    terms.channels.length > 0,
    namesSomeDays(terms.days),
    Boolean(terms.from || terms.to),
  ].filter((asked) => asked).length
  const found = outcome.state === 'searched' ? outcome.found : undefined
  const instead = insteadOfHits(waiting, outcome)
  const written: string = searchQueryOf(asking)
  const href: string = written ? `${pathname}?${written}` : pathname
  const narrowing: boolean = ruleNarrowsAnything(ruleTermsOfSearch(terms))
  const ruleHref = newRuleHref(terms)
  const unusedGenres = SEARCH_GENRE_OPTIONS.filter(
    (option) => !draft.genres.includes(option.value),
  )
  const unusedChannels = channels.filter(
    (channel) =>
      (!draft.kind || channel.kind === draft.kind) &&
      !draft.channels.includes(channel.id),
  )

  const channelNameOf = (id: string): string =>
    channels.find((channel) => channel.id === id)?.name || id

  const chips: { name: PhoneCondition; label: string; on: boolean }[] = [
    {
      name: 'kind',
      label: `種別 ${SEARCH_KIND_OPTIONS.find((option) => option.value === draft.kind)?.label ?? 'すべて'}`,
      on: Boolean(draft.kind),
    },
    {
      name: 'genre',
      label:
        draft.genres.length === 0
          ? 'ジャンル'
          : draft.genres.map(genreLabelOf).join('・'),
      on: draft.genres.length > 0 || draft.subgenres.length > 0,
    },
    {
      name: 'days',
      label: '曜日',
      on: namesSomeDays(draft.days) || Boolean(draft.from || draft.to),
    },
    {
      name: 'channels',
      label:
        draft.channels.length === 0
          ? 'チャンネル'
          : draft.channels.map(channelNameOf).join('・'),
      on: draft.channels.length > 0,
    },
    {
      name: 'fields',
      label:
        SEARCH_FIELD_OPTIONS.find((option) => option.value === draft.fields)
          ?.label ?? '対象',
      on: false,
    },
  ]
  const words = (found ? condition.q : undefined)?.split(/\s+/) ?? []

  return (
    <ScreenMain className="px-3.5 pt-6 pb-16 min-[701px]:px-5 min-[1061px]:px-[calc(30rem/16)] upright:pt-0.5">
      <PhoneBarLead>
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border-[1.5px] border-brand bg-surface pr-1.5 pl-3.5 text-ink-3 shadow-ring">
          <SearchIcon className="size-[calc(18rem/16)] shrink-0" />
          <input
            form={formId}
            type="search"
            enterKeyHint="search"
            aria-label="キーワード"
            autoFocus={outcome.state === 'idle'}
            value={draft.q}
            onChange={(event) => amend({ q: event.target.value })}
            className="h-full min-w-0 flex-1 bg-transparent text-ink outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {draft.q !== '' && (
            <button
              type="button"
              aria-label="キーワードを消す"
              onClick={() => amend({ q: '' })}
              className={cn(
                'tap-target flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-3 [&_svg]:size-4',
                pressable,
              )}
            >
              <CloseIcon />
            </button>
          )}
        </label>
      </PhoneBarLead>
      <OnAnUprightPhone>
        <ul
          aria-label="検索条件"
          data-slot="phone-conditions"
          className="-mx-3.5 mb-2 flex gap-2 overflow-x-auto px-4 pt-0.5 pb-1"
        >
          {chips.map((chip) => (
            <li key={chip.name} className="shrink-0">
              <button
                type="button"
                aria-expanded={phoneCondition === chip.name}
                onClick={() =>
                  setPhoneCondition(
                    phoneCondition === chip.name ? undefined : chip.name,
                  )
                }
                className={cn(
                  BAND_PRESS,
                  BAND_CONTROL,
                  'h-11 max-w-[calc(220rem/16)]',
                  (chip.on || phoneCondition === chip.name) &&
                    'border-brand-line bg-brand-soft font-bold text-brand',
                )}
              >
                <span className="truncate">{chip.label}</span>
                <ChevronDownIcon
                  className={cn(
                    'shrink-0 transition-transform',
                    phoneCondition === chip.name && 'rotate-180',
                  )}
                />
              </button>
            </li>
          ))}
        </ul>
      </OnAnUprightPhone>
      <div className="mb-4 flex flex-wrap items-start gap-3.5 upright:hidden">
        <div className="min-w-0 flex-1">
          <h1 className="heading upright:sr-only text-[calc(20rem/16)]">
            番組検索
          </h1>
        </div>
        <Button variant="watch" size="sm" asChild>
          <Link href="/guide">
            <ChevronLeftIcon />
            番組表へ
          </Link>
        </Button>
      </div>

      <section
        className={cn(
          'mb-3.5 rounded-lg bg-surface px-4 py-3.5',
          phoneCondition
            ? PHONE_CONDITION_SHOWN[phoneCondition]
            : 'upright:hidden',
        )}
      >
        <div className="flex flex-wrap items-center gap-2.5 upright:hidden">
          <h2 className="heading flex items-center gap-1.5 text-[calc(15rem/16)]">
            <FilterIcon className="size-4 text-brand" />
            検索条件
          </h2>
          {written !== '' && (
            <button
              type="button"
              onClick={clear}
              className="tap-target ml-auto cursor-pointer text-note text-ink-3 underline underline-offset-[3px] hover:text-ink-2"
            >
              条件を解除
            </button>
          )}
        </div>

        <form
          id={formId}
          className="mt-2.5 upright:mt-0"
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
          <ConditionRow label="キーワード" name="keyword">
            <Input
              aria-label="キーワード"
              value={draft.q}
              onChange={(event) => amend({ q: event.target.value })}
              areaClassName="w-[calc(300rem/16)] max-w-full"
              className="h-[calc(33rem/16)] rounded-full"
            />
          </ConditionRow>

          <ConditionRow label="除外キーワード" name="keyword">
            <Input
              aria-label="除外キーワード"
              value={draft.exclude}
              onChange={(event) => amend({ exclude: event.target.value })}
              areaClassName="w-[calc(300rem/16)] max-w-full"
              className="h-[calc(33rem/16)] rounded-full"
            />
          </ConditionRow>

          <ConditionRow label="対象範囲" name="fields">
            <Select
              value={draft.fields}
              onValueChange={(value) => amend({ fields: value as SearchField })}
            >
              <SelectTrigger
                size="sm"
                aria-label="対象範囲"
                className="w-fit rounded-full"
              >
                {
                  SEARCH_FIELD_OPTIONS.find(
                    (option) => option.value === draft.fields,
                  )?.label
                }
              </SelectTrigger>
              <SelectContent>
                {SEARCH_FIELD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ConditionRow>

          <ConditionRow label="種別" name="kind">
            <Select
              value={draft.kind ?? EVERY_KIND}
              onValueChange={(value) =>
                amend({
                  kind:
                    value === EVERY_KIND ? undefined : (value as SearchKind),
                  channels: [],
                })
              }
            >
              <SelectTrigger
                size="sm"
                aria-label="種別"
                className="w-fit rounded-full"
              >
                {SEARCH_KIND_OPTIONS.find(
                  (option) => option.value === draft.kind,
                )?.label ?? 'すべて'}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EVERY_KIND}>すべて</SelectItem>
                {SEARCH_KIND_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ConditionRow>

          <ConditionRow label="ジャンル" name="genre">
            {draft.genres.map((genre) => (
              <Pick
                key={genre}
                label={genreLabelOf(genre)}
                spoken={`ジャンル ${genreLabelOf(genre)} を外す`}
                onRemove={() =>
                  amend({
                    genres: draft.genres.filter((one) => one !== genre),
                  })
                }
              />
            ))}
            {unusedGenres.length > 0 && (
              <Select
                value=""
                onValueChange={(value) =>
                  amend({ genres: [...draft.genres, value as SearchGenre] })
                }
              >
                <SelectTrigger
                  size="sm"
                  aria-label="ジャンルを追加"
                  className="w-fit rounded-full text-ink-3"
                >
                  ＋ ジャンルを追加
                </SelectTrigger>
                <SelectContent>
                  {unusedGenres.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </ConditionRow>

          <ConditionRow label="サブジャンル" name="genre">
            <SubgenrePicks
              genres={draft.genres}
              subgenres={draft.subgenres}
              onChange={(subgenres) => amend({ subgenres })}
            />
          </ConditionRow>

          <ConditionRow label="チャンネル" name="channels">
            {draft.channels.map((id) => (
              <Pick
                key={id}
                label={channelNameOf(id)}
                spoken={`チャンネル ${channelNameOf(id)} を外す`}
                onRemove={() =>
                  amend({
                    channels: draft.channels.filter((one) => one !== id),
                  })
                }
              />
            ))}
            {unusedChannels.length > 0 &&
              draft.channels.length < SEARCH_MOST_CHANNELS && (
                <Select
                  value=""
                  onValueChange={(value) =>
                    amend({ channels: [...draft.channels, value] })
                  }
                >
                  <SelectTrigger
                    size="sm"
                    aria-label="チャンネルを追加"
                    className="w-fit rounded-full text-ink-3"
                  >
                    ＋ チャンネルを追加
                  </SelectTrigger>
                  <SelectContent>
                    {unusedChannels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        {channel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            {draft.channels.length >= SEARCH_MOST_CHANNELS && (
              <Hint>
                チャンネルは {SEARCH_MOST_CHANNELS} 局まで指定できます
              </Hint>
            )}
          </ConditionRow>

          <ConditionRow label="曜日" name="days">
            <DayPicks days={draft.days} onChange={(days) => amend({ days })} />
          </ConditionRow>

          <ConditionRow label="期間" name="days">
            <Input
              type="date"
              aria-label="期間の開始日"
              value={draft.from ?? ''}
              onChange={(event) =>
                amend({ from: event.target.value || undefined })
              }
              areaClassName="w-[calc(150rem/16)]"
              className="h-[calc(33rem/16)] rounded-full"
            />
            <span className="text-sub text-ink-3">〜</span>
            <Input
              type="date"
              aria-label="期間の終了日"
              value={draft.to ?? ''}
              onChange={(event) =>
                amend({ to: event.target.value || undefined })
              }
              areaClassName="w-[calc(150rem/16)]"
              className="h-[calc(33rem/16)] rounded-full"
            />
          </ConditionRow>

          <div className="mt-3.5 flex flex-wrap items-center gap-3">
            <Button type="submit">
              <SearchIcon />
              検索
            </Button>
            {askedCount > 0 && (
              <span className="text-note text-ink-3">
                {askedCount} 件の条件を指定しています
              </span>
            )}
          </div>
        </form>

        <div className="mt-3 flex min-w-0 items-center gap-2.5 border-t border-dashed border-line pt-3 upright:hidden">
          <LinkIcon className="size-3.5 shrink-0 text-ink-3" />
          <InFull says={decodeURIComponent(href)}>
            <code className="min-w-0 truncate font-code text-note text-ink-3">
              {decodeURIComponent(href)}
            </code>
          </InFull>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  `${window.location.origin}${href}`,
                )
                setCopied({ href, ok: true })
              } catch {
                setCopied({ href, ok: false })
              }
            }}
            className={cn(
              'tap-target ml-auto shrink-0 cursor-pointer text-note font-bold underline underline-offset-[3px]',
              copied?.href === href && !copied.ok
                ? 'text-coral'
                : 'text-ink-2 hover:text-ink',
            )}
          >
            {copied?.href !== href
              ? 'この条件の URL をコピー'
              : copied.ok
                ? 'コピーしました'
                : 'コピーできません'}
          </button>
        </div>

        <div className="mt-6 flex justify-end upright:hidden">
          {narrowing ? (
            <Button size="sm" asChild>
              <Link href={ruleHref}>
                <PlusIcon />
                この条件でルールを作成
              </Link>
            </Button>
          ) : (
            <Button
              size="sm"
              disabled
              title="キーワード・除外キーワード・ジャンル・サブジャンル・種別・チャンネル・曜日・期間のどれも指定していないため、ルールを作成できません。"
            >
              <PlusIcon />
              この条件でルールを作成
            </Button>
          )}
        </div>
      </section>

      {instead ??
        (found && (
          <div {...waitsWhile(waiting)}>
            <div className="mb-2.5 flex flex-wrap items-center gap-2.5 upright:hidden">
              <h2 className="heading flex items-center gap-1.5 text-[calc(15rem/16)]">
                <ListIcon className="size-4 text-brand" />
                検索結果
              </h2>
              <span className="text-sub text-ink-2">
                全{' '}
                <b className="font-code font-medium text-ink">{found.total}</b>{' '}
                件
                {found.hits.length > 0 && (
                  <>
                    {' '}
                    /{' '}
                    <b className="font-code font-medium text-ink">
                      {found.rangeFrom}
                    </b>
                    –
                    <b className="font-code font-medium text-ink">
                      {found.rangeTo}
                    </b>{' '}
                    件目
                  </>
                )}
              </span>
              {found.hits.length > 0 && (
                <div className="ml-auto flex flex-wrap items-center gap-2 max-[1060px]:ml-0 max-[1060px]:w-full">
                  <Select
                    value={condition.sort}
                    onValueChange={(value) =>
                      show({ sort: value as SearchSort, page: 1 })
                    }
                  >
                    <SelectTrigger
                      size="sm"
                      aria-label="並び替え"
                      className="w-fit rounded-full"
                    >
                      {
                        SEARCH_SORT_OPTIONS.find(
                          (o) => o.value === condition.sort,
                        )?.label
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
                      className="w-fit rounded-full"
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
                </div>
              )}
            </div>

            {found.hits.length === 0 ? (
              <EmptyState
                title="条件に合う番組がありません"
                className="mt-6 max-w-[calc(560rem/16)]"
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button size="sm" variant="halt" onClick={clear}>
                      条件を解除
                    </Button>
                    <Button size="sm" variant="watch" asChild>
                      <Link href="/guide">番組表へ</Link>
                    </Button>
                  </div>
                }
              />
            ) : (
              <>
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
                <div
                  data-slot="table-container"
                  tabIndex={0}
                  className={cn(
                    ADMIN_LIST_HEIGHT_CAP,
                    'overflow-auto rounded-xl bg-surface pb-1 outline-none focus-visible:shadow-ring upright:hidden',
                  )}
                >
                  <table
                    role="table"
                    data-cards=""
                    className="w-full min-w-[calc(800rem/16)] table-fixed border-separate border-spacing-0"
                  >
                    <colgroup>
                      <col style={{ width: 'calc(220rem/16)' }} />
                      <col style={{ width: 'calc(240rem/16)' }} />
                      <col style={{ width: 'calc(420rem/16)' }} />
                      <col style={{ width: 'calc(160rem/16)' }} />
                    </colgroup>
                    <thead role="rowgroup">
                      <tr role="row">
                        {[
                          'チャンネル',
                          WHEN_LABELS.broadcast,
                          '番組',
                          'ジャンル',
                        ].map((h) => (
                          <TableHead key={h} className="sticky top-0 z-10">
                            {h}
                          </TableHead>
                        ))}
                      </tr>
                    </thead>
                    <tbody role="rowgroup">
                      {found.hits.map((p) => (
                        <tr key={p.id} role="row" className="group">
                          <td
                            role="cell"
                            className="border-b border-dashed border-line px-[calc(13rem/16)] py-3 align-top text-ui"
                            {...cardPlace('meta')}
                          >
                            <span className="flex items-center gap-2">
                              <ChannelMark
                                logo={p.channelLogo}
                                no={p.channelNo}
                                keepsTheSlot
                              />
                              <span className="min-w-0 leading-[1.4]">
                                {p.channelName}
                              </span>
                            </span>
                          </td>
                          <td
                            role="cell"
                            className="border-b border-dashed border-line px-[calc(13rem/16)] py-3 align-top font-code text-ui whitespace-nowrap text-ink-2"
                            {...cardPlace('meta')}
                          >
                            <b className="mr-1.5 font-medium text-ink">
                              {p.dayLabel}
                            </b>
                            {p.startLabel}
                            {SPAN_DASH}
                            {p.endUndecided ? '終了未定' : p.endLabel}
                          </td>
                          <td
                            role="cell"
                            className="border-b border-dashed border-line px-[calc(13rem/16)] py-3 align-top"
                            {...cardPlace('lead')}
                          >
                            <span
                              className={cn(
                                READABLE_LINE,
                                'flex flex-wrap items-center gap-2',
                              )}
                            >
                              <Link
                                href={`/guide/programs/${p.id}`}
                                className="tap-target text-[calc(13rem/16)] font-bold text-ink underline-offset-[3px] hover:underline"
                              >
                                {p.title}
                              </Link>
                              {p.booked && (
                                <Badge variant="ok" className="font-bold">
                                  予約済み
                                </Badge>
                              )}
                            </span>
                            {p.description && (
                              <p
                                className={cn(
                                  READABLE_LINE,
                                  'mt-px text-note text-ink-3',
                                )}
                              >
                                {p.description}
                              </p>
                            )}
                          </td>
                          <td
                            role="cell"
                            className="border-b border-dashed border-line px-[calc(13rem/16)] py-3 align-top"
                            {...cardPlace('meta')}
                          >
                            <span
                              className={cn(
                                'inline-block rounded-full border px-[calc(11rem/16)] py-0.5 text-note font-medium text-ink-2',
                                GENRE_CLASS[p.genre],
                              )}
                            >
                              {p.genreLabel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pager
                  total={found.total}
                  page={found.page}
                  lastPage={found.lastPage}
                  onPage={(page) => show({ page }, true)}
                  className={cn(
                    'upright:mt-4',
                    found.lastPage <= 1 && 'upright:hidden',
                  )}
                />
              </>
            )}
          </div>
        ))}
    </ScreenMain>
  )
}

interface SearchDraft extends Omit<SearchTerms, 'q' | 'exclude'> {
  q: string
  exclude: string
}

function draftOf(terms: SearchTerms): SearchDraft {
  return { ...terms, q: terms.q ?? '', exclude: terms.exclude ?? '' }
}

function termsOf(draft: SearchDraft): SearchTerms {
  return {
    ...draft,
    q: draft.q.trim() || undefined,
    exclude: draft.exclude.trim() || undefined,
  }
}

function ConditionRow({
  label,
  name,
  children,
}: {
  label: string
  /** Which of the phone's chips opens this row. */
  name: PhoneCondition | 'keyword'
  children: ReactNode
}) {
  return (
    <div
      data-condition={name}
      className="flex flex-col gap-1.5 border-b border-dashed border-line py-[calc(9rem/16)] last:border-b-0 min-[701px]:flex-row min-[701px]:items-start min-[701px]:gap-3.5 upright:hidden upright:border-b-0"
    >
      <span className="text-note font-bold text-ink-3 min-[701px]:w-[calc(92rem/16)] min-[701px]:shrink-0 min-[701px]:pt-2">
        {label}
      </span>
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-[calc(18rem/16)]">
        {children}
      </span>
    </div>
  )
}

function Hint({ children }: { children: ReactNode }) {
  return <span className="text-note text-ink-3">{children}</span>
}
