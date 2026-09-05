'use client'

import type { ReactNode } from 'react'
import { useCallback, useState } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { usePathname, useRouter } from 'next/navigation'

import { ruleNarrowsAnything } from '@/lib/rules'
import { cn } from '@/lib/utils'
import type { SearchHits, SearchResult } from '@/repository/search'
import {
  EMPTY_SEARCH_CONDITION,
  SEARCH_FIELD_OPTIONS,
  SEARCH_GENRE_OPTIONS,
  SEARCH_KIND_OPTIONS,
  SEARCH_MOST_CHANNELS,
  SEARCH_PER_PAGE_OPTIONS,
  SEARCH_SORT_OPTIONS,
  genreLabelOf,
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { EmptyState } from '@/components/vela/empty-state'
import { IconButton } from '@/components/vela/icon-button'
import { Pager } from '@/components/vela/pager'
import {
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

/**
 * The 種別 row's neutral choice. Every other row says "not asked for" by being
 * empty, but a list has to have something selected to say it, and a Radix item
 * cannot carry an empty value. It is spelled here so it never reaches the
 * address: the writer is handed `undefined`, not this.
 */
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

/**
 * The screen, begun again from nothing whenever the conditions in the address
 * change.
 *
 * That is how the fields come to hold what the address asks for without a
 * `useEffect` watching it: the key is the conditions the address carries, so an
 * address the reader did not type into the fields — a link opened cold, the
 * back button, 条件をすべて消す — arrives as a new screen whose fields start at
 * what it says. An address that differs only in how the result is arranged is
 * the same key, and leaves a half-written condition exactly where it was.
 */
export function SearchView({ result }: { result: SearchResult }) {
  return (
    <SearchScreen key={searchTermsQueryOf(result.condition)} result={result} />
  )
}

function SearchScreen({ result }: { result: SearchResult }) {
  const router = useRouter()
  const pathname = usePathname()
  const [copied, setCopied] = useState<{ href: string; ok: boolean } | null>(
    null,
  )
  const { condition, channels, outcome } = result

  /**
   * The conditions as the fields hold them, which is not what was asked for
   * until 検索 is pressed. Started from the address, and started again from it
   * every time the address answers a different question.
   */
  const [draft, setDraft] = useState<SearchDraft>(() =>
    draftOf(searchTermsOf(condition)),
  )

  const go = useCallback(
    (next: SearchCondition, push = false) => {
      const written = searchQueryOf(next)
      const href = (written ? `${pathname}?${written}` : pathname) as Route
      const navigate = push ? router.push : router.replace
      navigate(href, { scroll: false })
    },
    [router, pathname],
  )

  /** Answers one condition differently. Nothing is asked for, and nothing moves. */
  const amend = (part: Partial<SearchDraft>): void =>
    setDraft((previous) => ({ ...previous, ...part }))

  /**
   * Arranges what was already asked for. The conditions come from the address
   * rather than from the fields, so a keyword still being typed is not
   * confirmed by a reader who only meant to sort the rows they have.
   */
  const show = (part: Partial<SearchViewing>, push = false): void =>
    go({ ...condition, ...part }, push)

  /**
   * Empties the fields as well as the address. Emptying the address is usually
   * enough — the screen begins again on a key that has changed — but a reader
   * who typed into an address that was already bare would change no key, and
   * would watch the button do nothing to the field under their hands.
   */
  const clear = (): void => {
    setDraft(draftOf(searchTermsOf(EMPTY_SEARCH_CONDITION)))
    go(EMPTY_SEARCH_CONDITION)
  }

  const terms: SearchTerms = termsOf(draft)

  /**
   * The address 検索 would write: the conditions in the fields, arranged the way
   * the reader is already reading, from the first page — a condition just
   * assembled has fewer pages than the one they were standing on.
   *
   * It is what the line under the fields shows and what the copy button copies,
   * so what pressing 検索 does is legible before it is pressed. Asking leaves an
   * entry behind, because a question the reader put is somewhere they have been
   * and the back button is how they get to it.
   */
  const asking: SearchCondition = {
    ...terms,
    ...searchViewingOf(condition),
    page: 1,
  }

  /**
   * The conditions that narrow, which is what `narrowsAnything` counts and so
   * what the reader is told about. 探す場所 is not among them: it only says
   * where a keyword is looked for, so counting it would promise a search that
   * the store then turns away as asking for nothing.
   */
  const askedCount: number = [
    Boolean(terms.q),
    Boolean(terms.exclude),
    terms.genres.length > 0,
    Boolean(terms.kind),
    terms.channels.length > 0,
    Boolean(terms.from || terms.to),
  ].filter((asked) => asked).length
  const found = outcome.state === 'searched' ? outcome.found : undefined
  const written: string = searchQueryOf(asking)
  const href: string = written ? `${pathname}?${written}` : pathname
  /**
   * Whether the conditions narrow the guide, which is what a rule is refused
   * for not doing. The span is not among them: a rule does not carry one.
   */
  const narrowing: boolean = ruleNarrowsAnything(terms)
  const ruleHref =
    `/reservations/rules?rule=new&${searchTermsQueryOf(terms)}` as Route
  const unusedGenres = SEARCH_GENRE_OPTIONS.filter(
    (option) => !draft.genres.includes(option.value),
  )
  /**
   * The channels the 種別 in the fields leaves standing. Narrowed here rather
   * than by the store, which only ever hears the 種別 that was asked for: a
   * reader widening it back would otherwise be offered the narrower list.
   */
  const unusedChannels = channels.filter(
    (channel) =>
      (!draft.kind || channel.kind === draft.kind) &&
      !draft.channels.includes(channel.id),
  )

  /** A channel chosen under one 種別 keeps its spelling if the list narrows. */
  const channelNameOf = (id: string): string =>
    channels.find((channel) => channel.id === id)?.name || id

  return (
    <ScreenMain className="px-3.5 pt-6 pb-16 min-[701px]:px-5 min-[1061px]:px-[30px]">
      <div className="mb-4 flex flex-wrap items-start gap-3.5">
        <div className="min-w-0 flex-1">
          <h1 className="heading text-[20px]">番組検索</h1>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/guide">
            <ChevronLeftIcon />
            番組表へ戻る
          </Link>
        </Button>
      </div>

      <section className="mb-3.5 rounded-lg bg-surface px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="heading flex items-center gap-1.5 text-[15px]">
            <FilterIcon className="size-4 text-brand" />
            検索条件
          </h2>
          {written !== '' && (
            <button
              type="button"
              onClick={clear}
              className="tap-target ml-auto cursor-pointer text-note text-ink-3 underline underline-offset-[3px] hover:text-ink-2"
            >
              条件をすべて消す
            </button>
          )}
        </div>

        {/*
          Every condition is answered in here and asked for by submitting, which
          is the 検索 button and — because the browser submits a form of its own
          accord from a field the reader presses Enter in — Enter in any of the
          fields.
        */}
        <form
          className="mt-2.5"
          /*
            The Enter that settles a conversion is not the Enter that asks.
            Typing Japanese ends every word with one, and WebKit — which is
            every browser on the iPad — lets that keypress go on to submit the
            form, so a reader picking the characters of their first word would
            have the half of it they had settled asked for and the rest left in
            the field. Chromium and Gecko hold it back themselves; taking the
            default off the keypress is what holds it back everywhere.
          */
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
          <ConditionRow label="キーワード">
            <Input
              aria-label="キーワード"
              value={draft.q}
              onChange={(event) => amend({ q: event.target.value })}
              areaClassName="w-[300px] max-w-full"
              className="h-[33px] rounded-full"
            />
          </ConditionRow>

          <ConditionRow label="除外">
            <Input
              aria-label="除外"
              value={draft.exclude}
              onChange={(event) => amend({ exclude: event.target.value })}
              areaClassName="w-[300px] max-w-full"
              className="h-[33px] rounded-full"
            />
          </ConditionRow>

          <ConditionRow label="探す場所">
            <Select
              value={draft.fields}
              onValueChange={(value) => amend({ fields: value as SearchField })}
            >
              <SelectTrigger
                size="sm"
                aria-label="探す場所"
                className="w-fit rounded-full"
              >
                {
                  SEARCH_FIELD_OPTIONS.find(
                    (option) => option.value === draft.fields,
                  )?.label
                }
              </SelectTrigger>
              <SelectContent position="popper">
                {SEARCH_FIELD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ConditionRow>

          <ConditionRow label="ジャンル">
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
                  aria-label="ジャンルを足す"
                  className="w-fit rounded-full text-ink-3"
                >
                  ＋ ジャンルを足す
                </SelectTrigger>
                <SelectContent position="popper">
                  {unusedGenres.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </ConditionRow>

          <ConditionRow label="種別">
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
              <SelectContent position="popper">
                <SelectItem value={EVERY_KIND}>すべて</SelectItem>
                {SEARCH_KIND_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ConditionRow>

          <ConditionRow label="チャンネル">
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
            {/*
              The reader keeps the first `SEARCH_MOST_CHANNELS` and drops the
              rest, so a screen that went on offering them would write an
              address it could not read back: the extra channel would be in the
              URL, gone from the condition that came back, and the chip for it
              would vanish with nothing said. Stop offering at the ceiling and
              say why instead.
            */}
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
                    aria-label="チャンネルを足す"
                    className="w-fit rounded-full text-ink-3"
                  >
                    ＋ チャンネルを足す
                  </SelectTrigger>
                  <SelectContent position="popper">
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

          <ConditionRow label="期間">
            <Input
              type="date"
              aria-label="期間の開始日"
              value={draft.from ?? ''}
              onChange={(event) =>
                amend({ from: event.target.value || undefined })
              }
              areaClassName="w-[150px]"
              className="h-[33px] rounded-full"
            />
            <span className="text-sub text-ink-3">〜</span>
            <Input
              type="date"
              aria-label="期間の終了日"
              value={draft.to ?? ''}
              onChange={(event) =>
                amend({ to: event.target.value || undefined })
              }
              areaClassName="w-[150px]"
              className="h-[33px] rounded-full"
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

        <div className="mt-3 flex min-w-0 items-center gap-2.5 border-t border-dashed border-line pt-3">
          <LinkIcon className="size-3.5 shrink-0 text-ink-3" />
          <code className="min-w-0 truncate font-code text-note text-ink-3">
            {decodeURIComponent(href)}
          </code>
          {/*
            The clipboard is not there to be written to unless the page came
            over a trusted origin, and a recording server on a house network is
            reached by name over plain http as often as not. Saying so is the
            point: the address is on the line to the left either way, and a
            button that quietly did nothing would send the reader away thinking
            they had the URL.
          */}
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

        <div className="mt-6 flex justify-end">
          {narrowing ? (
            <Button size="sm" asChild>
              <Link href={ruleHref}>
                <PlusIcon />
                この条件でルールを作る
              </Link>
            </Button>
          ) : (
            <Button
              size="sm"
              disabled
              title="キーワード・除外キーワード・対象フィールド・ジャンル・種別・チャンネルのうち、1 つ以上を指定するとルールにできます。"
            >
              <PlusIcon />
              この条件でルールを作る
            </Button>
          )}
        </div>
      </section>

      {outcome.state === 'idle' ? (
        <EmptyState
          spot="antenna"
          title="まだ検索していません"
          className="mx-auto mt-10 max-w-[560px]"
        />
      ) : outcome.state === 'refused' ? (
        <EmptyState
          spot="antenna"
          title="この条件では検索できません"
          className="mx-auto mt-10 max-w-[560px]"
        >
          {outcome.message}
        </EmptyState>
      ) : (
        found && (
          <>
            <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
              <h2 className="heading flex items-center gap-1.5 text-[15px]">
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
                    <SelectContent position="popper">
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
                    <SelectContent position="popper">
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
                spot="antenna"
                title="該当する番組がありません"
                className="mx-auto mt-6 max-w-[560px]"
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button size="sm" variant="outline" onClick={clear}>
                      条件をすべて消す
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/guide">番組表へ戻る</Link>
                    </Button>
                  </div>
                }
              />
            ) : (
              <>
                {/*
                  The conditions above are read, so the results are bounded
                  the way an admin list under a form is, and to the same
                  height: a list is one height wherever it sits.
                */}
                <div
                  data-slot="table-container"
                  // The container scrolls, so it has to be reachable by keyboard.
                  tabIndex={0}
                  className={cn(
                    ADMIN_LIST_HEIGHT_CAP,
                    '-mx-1 overflow-auto px-1 pb-1 outline-none focus-visible:shadow-ring',
                  )}
                >
                  <table className="w-full min-w-[760px] border-separate border-spacing-0">
                    <thead>
                      <tr>
                        {['チャンネル', '放送日時', '番組', 'ジャンル'].map(
                          (h) => (
                            <th
                              key={h}
                              className="sticky top-0 z-10 bg-surface-2 px-3.5 py-[9px] text-left text-[10.5px] font-bold tracking-[0.05em] whitespace-nowrap text-ink-3 first:rounded-l-md last:rounded-r-md"
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {found.hits.map((p) => (
                        <tr key={p.id} className="group">
                          <td className="border-b border-dashed border-line px-3.5 py-3 align-top text-ui whitespace-nowrap">
                            {p.channelName}
                            {p.channelNo && (
                              <small className="ml-1.5 font-code text-[10.5px] text-ink-3">
                                {p.channelNo}
                              </small>
                            )}
                          </td>
                          <td className="border-b border-dashed border-line px-3.5 py-3 align-top font-code text-ui whitespace-nowrap text-ink-2">
                            <b className="mr-1.5 font-medium text-ink">
                              {p.dayLabel}
                            </b>
                            {p.startLabel}–
                            {p.endUndecided ? '終了未定' : p.endLabel}
                          </td>
                          <td className="border-b border-dashed border-line px-3.5 py-3 align-top">
                            <span className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/guide/programs/${p.id}`}
                                className="tap-target text-[13px] font-bold text-ink underline-offset-[3px] hover:underline"
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
                              <p className="mt-px text-note text-ink-3">
                                {p.description}
                              </p>
                            )}
                          </td>
                          <td className="border-b border-dashed border-line px-3.5 py-3 align-top">
                            <span
                              className={cn(
                                'inline-block rounded-full border px-[11px] py-0.5 text-note font-medium text-ink-2',
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
                />
              </>
            )}
          </>
        )
      )}
    </ScreenMain>
  )
}

/**
 * The conditions as the fields hold them.
 *
 * The two text fields keep what was typed, the spaces around it included: a
 * value trimmed as it is typed is a value that cannot be typed a space into,
 * and the words either side of one are the whole point of the field.
 */
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

/**
 * One condition, one line: what it is on the left, what it is set to on the
 * right. What the row holds is the answer being assembled; it counts once 検索
 * has been pressed on it.
 *
 * Narrow enough and the heading sits above its row instead of beside it, which
 * is the only way a 300px field and a 92px heading both fit.
 */
function ConditionRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5 border-b border-dashed border-line py-[9px] last:border-b-0 min-[701px]:flex-row min-[701px]:items-start min-[701px]:gap-3.5">
      <span className="text-note font-bold text-ink-3 min-[701px]:w-[92px] min-[701px]:shrink-0 min-[701px]:pt-2">
        {label}
      </span>
      {/*
        Chips are 26px tall and each carries a 44px press area, so on one line
        they have room and on two they take each other's presses: half of the
        26 + gap between two lines is all either of them gets. 18px of gap is
        what makes that half 22, and 22 + 22 the 44 the gate asks for. Only the
        space between wrapped lines changes; a row that fits on one line is
        drawn exactly as before.
      */}
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-[18px]">
        {children}
      </span>
    </div>
  )
}

function Hint({ children }: { children: ReactNode }) {
  return <span className="text-note text-ink-3">{children}</span>
}

/**
 * One answer to a condition that takes several. It sits beside the list it was
 * chosen from rather than in a row of its own, so choosing another one leaves
 * every earlier answer where it was.
 */
function Pick({
  label,
  spoken,
  onRemove,
}: {
  label: string
  spoken: string
  onRemove: () => void
}) {
  return (
    <span className="inline-flex items-center gap-[7px] rounded-full border border-brand bg-brand-soft py-1 pr-1.5 pl-3 text-sub font-bold text-brand">
      {label}
      <button
        type="button"
        aria-label={spoken}
        onClick={onRemove}
        className="tap-target flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface text-brand [&_svg]:size-2.5"
      >
        <CloseIcon />
      </button>
    </span>
  )
}
