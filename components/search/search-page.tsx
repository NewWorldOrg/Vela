'use client'

import type { ReactNode } from 'react'
import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { usePathname, useRouter } from 'next/navigation'

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
} from '@/repository/search-options'
import type {
  SearchCondition,
  SearchField,
  SearchGenre,
  SearchKind,
  SearchSort,
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

function pageNumbers(current: number, last: number): (number | 'gap')[] {
  const wanted = [1, current - 1, current, current + 1, last]
  const items: (number | 'gap')[] = []
  let previous = 0

  for (let n = 1; n <= last; n++) {
    if (!wanted.includes(n)) {
      continue
    }
    if (n - previous > 1) {
      items.push('gap')
    }
    items.push(n)
    previous = n
  }

  return items
}

export function SearchView({ result }: { result: SearchResult }) {
  const router = useRouter()
  const pathname = usePathname()
  const [copied, setCopied] = useState<{ href: string; ok: boolean } | null>(
    null,
  )
  const form = useRef<HTMLFormElement>(null)
  const { condition, channels, outcome } = result

  const go = useCallback(
    (next: SearchCondition, push = false) => {
      const written = searchQueryOf(next)
      const href = (written ? `${pathname}?${written}` : pathname) as Route
      const navigate = push ? router.push : router.replace
      navigate(href, { scroll: false })
    },
    [router, pathname],
  )

  /**
   * What the two text fields hold at this moment, which is not yet in the
   * address: they are confirmed with Enter or 検索 rather than on every letter,
   * so between one of those and the next the field is ahead of the condition.
   *
   * Every other control writes the whole condition, and so has to write these
   * too. Leaving them out would send the reader a condition they can see they
   * did not ask for — the keyword still in the field, and gone from the address
   * underneath it — which is the two-places-for-one-condition this screen was
   * rebuilt to stop.
   */
  const typed = useCallback((): Partial<SearchCondition> => {
    if (!form.current) {
      return {}
    }

    const written = new FormData(form.current)

    return {
      q: wordsOf(written.get('q')),
      exclude: wordsOf(written.get('exclude')),
    }
  }, [])

  /**
   * The whole condition, with one part of it answered differently — and back to
   * the first page, because a narrower condition has fewer pages than the one
   * the reader is standing on.
   */
  const ask = useCallback(
    (part: Partial<SearchCondition>) =>
      go({ ...condition, ...typed(), ...part, page: 1 }),
    [go, condition, typed],
  )

  /**
   * The conditions that narrow, which is what `narrowsAnything` counts and so
   * what the reader is told about. 探す場所 is not among them: it only says
   * where a keyword is looked for, so counting it would promise a search that
   * the store then turns away as asking for nothing.
   */
  const askedCount: number = [
    Boolean(condition.q),
    Boolean(condition.exclude),
    condition.genres.length > 0,
    Boolean(condition.kind),
    condition.channels.length > 0,
    Boolean(condition.from || condition.to),
  ].filter((asked) => asked).length
  const found = outcome.state === 'searched' ? outcome.found : undefined
  const noHit = found !== undefined && found.hits.length === 0
  const written: string = searchQueryOf(condition)
  const href: string = written ? `${pathname}?${written}` : pathname
  const unusedGenres = SEARCH_GENRE_OPTIONS.filter(
    (option) => !condition.genres.includes(option.value),
  )
  const unusedChannels = channels.filter(
    (channel) => !condition.channels.includes(channel.id),
  )

  /** A channel chosen under one 種別 keeps its spelling if the list narrows. */
  const channelNameOf = (id: string): string =>
    channels.find((channel) => channel.id === id)?.name || id

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-3.5 pt-6 pb-16 min-[701px]:px-5 min-[1061px]:px-[30px]">
      <div className="mb-4 flex flex-wrap items-start gap-3.5">
        <div className="min-w-0 flex-1">
          <h1 className="heading text-[20px]">番組検索</h1>
          <p className="mt-0.5 text-sub text-ink-2">
            検索の対象は放送予定の番組です。放送が終了した番組は結果に出ません。
          </p>
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
              onClick={() => go(EMPTY_SEARCH_CONDITION)}
              className="tap-target ml-auto cursor-pointer text-note text-ink-3 underline underline-offset-[3px] hover:text-ink-2"
            >
              条件をすべて消す
            </button>
          )}
        </div>

        <form
          ref={form}
          className="mt-2.5"
          onSubmit={(event) => {
            event.preventDefault()
            ask({})
          }}
        >
          {/*
            Keyed on the address rather than on the value: the field is
            uncontrolled between confirmations, so the only way an address the
            reader did not type — 条件をすべて消す, or the back button — reaches
            it is by being drawn again. Keying on the value alone left a field
            that was never confirmed sitting there through a clear.
          */}
          <ConditionRow label="キーワード">
            <Input
              key={`q ${written}`}
              name="q"
              aria-label="キーワード"
              defaultValue={condition.q ?? ''}
              areaClassName="w-[300px] max-w-full"
              className="h-[33px] rounded-full"
            />
            <Hint>空白で区切ると、すべてを含む番組を探します</Hint>
          </ConditionRow>

          <ConditionRow label="除外">
            <Input
              key={`exclude ${written}`}
              name="exclude"
              aria-label="除外"
              defaultValue={condition.exclude ?? ''}
              areaClassName="w-[300px] max-w-full"
              className="h-[33px] rounded-full"
            />
            <Hint>この語を含む番組を結果から外します</Hint>
          </ConditionRow>

          <ConditionRow label="探す場所">
            <Select
              value={condition.fields}
              onValueChange={(value) => ask({ fields: value as SearchField })}
            >
              <SelectTrigger
                size="sm"
                aria-label="探す場所"
                className="w-fit rounded-full"
              >
                {
                  SEARCH_FIELD_OPTIONS.find(
                    (option) => option.value === condition.fields,
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
            {condition.genres.map((genre) => (
              <Pick
                key={genre}
                label={genreLabelOf(genre)}
                spoken={`ジャンル ${genreLabelOf(genre)} を外す`}
                onRemove={() =>
                  ask({
                    genres: condition.genres.filter((one) => one !== genre),
                  })
                }
              />
            ))}
            {unusedGenres.length > 0 && (
              <Select
                value=""
                onValueChange={(value) =>
                  ask({ genres: [...condition.genres, value as SearchGenre] })
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
              value={condition.kind ?? EVERY_KIND}
              onValueChange={(value) =>
                ask({
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
                  (option) => option.value === condition.kind,
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
            {condition.channels.map((id) => (
              <Pick
                key={id}
                label={channelNameOf(id)}
                spoken={`チャンネル ${channelNameOf(id)} を外す`}
                onRemove={() =>
                  ask({
                    channels: condition.channels.filter((one) => one !== id),
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
              condition.channels.length < SEARCH_MOST_CHANNELS && (
                <Select
                  value=""
                  onValueChange={(value) =>
                    ask({ channels: [...condition.channels, value] })
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
            {condition.channels.length === 0 && (
              <Hint>指定しなければ、すべてのチャンネルから探します</Hint>
            )}
            {condition.channels.length >= SEARCH_MOST_CHANNELS && (
              <Hint>
                チャンネルは {SEARCH_MOST_CHANNELS}{' '}
                局まで指定できます。足すには、どれかを外してください
              </Hint>
            )}
          </ConditionRow>

          <ConditionRow label="期間">
            <Input
              type="date"
              aria-label="期間の開始日"
              value={condition.from ?? ''}
              onChange={(event) =>
                ask({ from: event.target.value || undefined })
              }
              areaClassName="w-[150px]"
              className="h-[33px] rounded-full"
            />
            <span className="text-sub text-ink-3">〜</span>
            <Input
              type="date"
              aria-label="期間の終了日"
              value={condition.to ?? ''}
              onChange={(event) => ask({ to: event.target.value || undefined })}
              areaClassName="w-[150px]"
              className="h-[33px] rounded-full"
            />
            <Hint>空のままなら、放送予定のすべてが対象です</Hint>
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
                : 'コピーできません。左の URL を選んで写してください'}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md bg-brand-soft px-3.5 py-3">
          <div className="min-w-[220px] flex-1">
            <b className="block text-ui font-bold text-brand">
              いまの検索条件は、そのまま自動録画ルールの条件になります。
            </b>
            <span className="block text-note text-ink-2">
              {noHit
                ? 'いま該当がなくても、条件に合う番組が放送されたときに録画されます。'
                : 'キーワード・除外キーワード・対象フィールド・ジャンル・チャンネルが引き継がれます。期間は引き継ぎません。'}
            </span>
          </div>
          <Button size="sm" disabled title="ルール作成はこれから実装されます">
            <PlusIcon />
            この条件でルールを作る
          </Button>
        </div>
      </section>

      {outcome.state === 'idle' ? (
        <EmptyState
          spot="antenna"
          title="まだ検索していません"
          className="mx-auto mt-10 max-w-[560px]"
        >
          条件を組み立てて検索してください。検索の対象は放送予定の番組です。放送が終了した番組は結果に出ません。
        </EmptyState>
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
                      ask({ sort: value as SearchSort })
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
                    onValueChange={(value) => ask({ perPage: Number(value) })}
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => go(EMPTY_SEARCH_CONDITION)}
                    >
                      条件をすべて消す
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/guide">番組表へ戻る</Link>
                    </Button>
                  </div>
                }
              >
                検索の対象は放送予定の番組です。放送が終了した番組は結果に出ません。キーワード・除外キーワード・期間を見直してください。
              </EmptyState>
            ) : (
              <>
                <div className="-mx-1 overflow-x-auto px-1 pb-1">
                  <table className="w-full min-w-[760px] border-separate border-spacing-0">
                    <thead>
                      <tr>
                        {['チャンネル', '放送日時', '番組', 'ジャンル'].map(
                          (h) => (
                            <th
                              key={h}
                              className="bg-surface-2 px-3.5 py-[9px] text-left text-[10.5px] font-bold tracking-[0.05em] whitespace-nowrap text-ink-3 first:rounded-l-md last:rounded-r-md"
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
                  found={found}
                  onPage={(page) =>
                    go({ ...condition, ...typed(), page }, true)
                  }
                />
              </>
            )}
          </>
        )
      )}
    </main>
  )
}

function wordsOf(value: FormDataEntryValue | null): string | undefined {
  return typeof value === 'string' ? value.trim() || undefined : undefined
}

/**
 * One condition, one line: what it is on the left, what it is set to on the
 * right. The field is the condition — there is no second copy of it to keep in
 * step, and nothing to confirm before it counts.
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
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
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

function Pager({
  found,
  onPage,
}: {
  found: SearchHits
  onPage: (page: number) => void
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-dashed border-line pt-3.5">
      <span className="mr-auto pr-3 text-sub text-ink-2">
        全 <b className="font-code font-medium text-ink">{found.total}</b> 件 /{' '}
        <b className="font-code font-medium text-ink">{found.lastPage}</b>{' '}
        ページ中 <b className="font-code font-medium text-ink">{found.page}</b>{' '}
        ページ目
      </span>
      <IconButton
        size="sm"
        aria-label="前のページ"
        disabled={found.page <= 1}
        onClick={() => onPage(found.page - 1)}
      >
        <ChevronLeftIcon />
      </IconButton>
      {pageNumbers(found.page, found.lastPage).map((item, index) =>
        item === 'gap' ? (
          <span key={`gap-${index}`} className="px-0.5 font-code text-ink-3">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-label={`${item} ページ目`}
            aria-current={item === found.page ? 'page' : undefined}
            onClick={() => onPage(item)}
            className={cn(
              'tap-target flex h-[29px] min-w-[29px] cursor-pointer items-center justify-center rounded-full border px-2.5 font-code text-sub shadow-pop transition-[translate,box-shadow,color] duration-150 ease-toy hover:-translate-x-px hover:-translate-y-px hover:shadow-pop-lg active:translate-x-px active:translate-y-px active:shadow-pop-none',
              item === found.page
                ? 'border-btn-fill bg-btn-fill text-on-btn'
                : 'border-line-strong bg-surface text-ink-2 hover:text-ink',
            )}
          >
            {item}
          </button>
        ),
      )}
      <IconButton
        size="sm"
        aria-label="次のページ"
        disabled={found.page >= found.lastPage}
        onClick={() => onPage(found.page + 1)}
      >
        <ChevronRightIcon />
      </IconButton>
    </div>
  )
}
