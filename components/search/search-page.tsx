'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { cn } from '@/lib/utils'
import {
  SEARCH_DEFAULT_PER_PAGE,
  SEARCH_DEFAULT_SORT,
  SEARCH_PER_PAGE_OPTIONS,
  SEARCH_SORT_OPTIONS,
  type SearchHits,
  type SearchResult,
} from '@/repository/search'
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
  ListIcon,
  PlusIcon,
  SearchIcon,
} from '@/components/vela/icons'

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
  const searchParams = useSearchParams()
  const { condition, periodLabel, outcome } = result

  const patch = useCallback(
    (next: Record<string, string | null>, push = false) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(next)) {
        if (v == null || v === '') {
          params.delete(k)
        } else {
          params.set(k, v)
        }
      }
      if (!('page' in next)) {
        params.delete('page')
      }
      const qs = params.toString()
      const href = (qs ? `${pathname}?${qs}` : pathname) as Route
      const navigate = push ? router.push : router.replace
      navigate(href, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const clearAll = useCallback(
    () =>
      patch({
        q: null,
        from: null,
        to: null,
        sort: null,
        per_page: null,
      }),
    [patch],
  )

  const hasCondition = Boolean(condition.q || condition.from || condition.to)
  const found = outcome.state === 'searched' ? outcome.found : undefined
  const noHit = found !== undefined && found.hits.length === 0
  const urlLine = `/search${searchParams.toString() ? `?${searchParams}` : ''}`

  const chips: {
    key: string
    label: string
    value?: string
    clear: Record<string, string | null>
  }[] = [
    { key: 'q', label: 'キーワード', value: condition.q, clear: { q: null } },
    {
      key: 'period',
      label: '期間',
      value: periodLabel,
      clear: { from: null, to: null },
    },
  ]

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
        <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
          <h2 className="heading flex items-center gap-1.5 text-[15px]">
            <SearchIcon className="size-4 text-brand" />
            検索条件
          </h2>
          {hasCondition && (
            <button
              type="button"
              onClick={clearAll}
              className="ml-auto cursor-pointer text-sub font-bold text-brand underline-offset-[3px] hover:underline"
            >
              条件をすべて消す
            </button>
          )}
        </div>

        <p className="flex items-center gap-2 rounded-md bg-surface-2 px-3 py-2 font-code text-[11.5px] break-all text-ink-2">
          <ListIcon className="size-3.5 shrink-0 text-ink-3" />
          {urlLine}
        </p>
        <p className="mt-1.5 text-note text-ink-3">
          この URL
          がそのまま検索条件です。共有・読み込み直しで同じ結果に戻ります。
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((c) =>
            c.value ? (
              <span
                key={c.key}
                className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface py-1 pr-1.5 pl-3 text-sub"
              >
                <span className="text-note font-bold text-ink-3">
                  {c.label}
                </span>
                <span className="font-medium">{c.value}</span>
                <button
                  type="button"
                  aria-label={`${c.label}の条件を消す`}
                  onClick={() => patch(c.clear)}
                  className="flex size-[18px] cursor-pointer items-center justify-center rounded-full text-ink-3 transition-colors duration-150 hover:bg-surface-2 hover:text-ink [&_svg]:size-3"
                >
                  <CloseIcon />
                </button>
              </span>
            ) : (
              <span
                key={c.key}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line bg-surface-2 px-3 py-1 text-sub text-ink-3"
              >
                <span className="text-note font-bold">{c.label}</span>未指定
              </span>
            ),
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2.5 border-t border-dashed border-line pt-3">
          <span className="text-cap font-bold tracking-[0.04em] text-ink-3">
            条件を追加
          </span>
          <form
            className="min-w-[180px] flex-[0_1_240px]"
            onSubmit={(e) => {
              e.preventDefault()
              const value = new FormData(e.currentTarget).get('q')
              patch({ q: typeof value === 'string' ? value : null })
            }}
          >
            <Input
              key={condition.q ?? ''}
              name="q"
              defaultValue={condition.q ?? ''}
              placeholder="キーワードを追加"
              className="h-[33px] rounded-full"
            />
          </form>
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              aria-label="期間の開始日"
              value={condition.from ?? ''}
              onChange={(e) => patch({ from: e.target.value || null })}
              className="h-[33px] w-[150px] rounded-full"
            />
            <span className="text-sub text-ink-3">〜</span>
            <Input
              type="date"
              aria-label="期間の終了日"
              value={condition.to ?? ''}
              onChange={(e) => patch({ to: e.target.value || null })}
              className="h-[33px] w-[150px] rounded-full"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md bg-tint-sage px-3.5 py-3">
          <div className="min-w-[220px] flex-1">
            <b className="block text-ui font-bold">
              いまの検索条件は、そのまま自動録画ルールの条件になります。
            </b>
            <span className="text-note text-ink-2">
              {noHit
                ? 'いま該当がなくても、条件に合う番組が放送されたときに録画されます。'
                : 'キーワードがルールへ引き継がれます。'}
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
                    onValueChange={(v) =>
                      patch({ sort: v === SEARCH_DEFAULT_SORT ? null : v })
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
                    onValueChange={(v) =>
                      patch({
                        per_page:
                          v === String(SEARCH_DEFAULT_PER_PAGE) ? null : v,
                      })
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
                    <Button size="sm" variant="outline" onClick={clearAll}>
                      条件をすべて消す
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/guide">番組表へ戻る</Link>
                    </Button>
                  </div>
                }
              >
                検索の対象は放送予定の番組です。放送が終了した番組は結果に出ません。キーワード・期間を見直してください。
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
                                className="text-[13px] font-bold text-ink underline-offset-[3px] hover:underline"
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
                <Pager found={found} onPage={(n) => goPage(patch, n)} />
              </>
            )}
          </>
        )
      )}
    </main>
  )
}

function goPage(
  patch: (next: Record<string, string | null>, push?: boolean) => void,
  page: number,
) {
  patch({ page: page > 1 ? String(page) : null }, true)
}

function Pager({
  found,
  onPage,
}: {
  found: SearchHits
  onPage: (page: number) => void
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-line pt-3.5">
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
              'flex h-[29px] min-w-[29px] cursor-pointer items-center justify-center rounded-full border px-2.5 font-code text-sub shadow-pop transition-[translate,box-shadow,color] duration-150 ease-toy hover:-translate-x-px hover:-translate-y-px hover:shadow-pop-lg active:translate-x-px active:translate-y-px active:shadow-pop-none',
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
