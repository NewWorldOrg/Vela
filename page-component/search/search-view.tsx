'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { cn } from '@/lib/utils'
import { CHANNEL_KINDS } from '@/repository/channels'
import {
  SEARCH_FIELD_OPTIONS,
  fieldLabel,
  type SearchResult,
} from '@/repository/search'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/vela/empty-state'
import { ConditionSelect } from '@/page-component/search/condition-select'
import {
  ChevronLeftIcon,
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
}

export function SearchView({ result }: { result: SearchResult }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { condition, hasCondition, hits, genres } = result

  const patch = useCallback(
    (next: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(next)) {
        if (v == null || v === '') {
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

  const chips = [
    { key: 'q', label: 'キーワード', value: condition.q },
    { key: 'exclude', label: '除外キーワード', value: condition.exclude },
    {
      key: 'fields',
      label: '対象フィールド',
      value: fieldLabel(condition.fields),
    },
    {
      key: 'genre',
      label: 'ジャンル',
      value: genres.find((g) => g.value === condition.genre)?.label,
    },
    {
      key: 'kind',
      label: '種別',
      value: CHANNEL_KINDS.find((k) => k.value === condition.kind)?.label,
    },
    {
      key: 'ch',
      label: 'チャンネル',
      value: result.channelName,
    },
  ]
  const urlLine = `/search${searchParams.toString() ? `?${searchParams}` : ''}`

  return (
    <main className="flex-1 px-3.5 pt-6 pb-16 min-[701px]:px-5 min-[1061px]:px-[30px]">
      <div className="mb-4 flex flex-wrap items-start gap-3.5">
        <div className="min-w-0 flex-1">
          <h1 className="heading text-[20px]">番組検索</h1>
          <p className="mt-0.5 text-sub text-ink-2">
            条件を組み立ててから検索します。条件はそのまま自動録画ルールにできます
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
              onClick={() =>
                patch({
                  q: null,
                  exclude: null,
                  fields: null,
                  genre: null,
                  kind: null,
                  ch: null,
                })
              }
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
                  onClick={() => patch({ [c.key]: null })}
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
          <ConditionSelect
            label="ジャンルを選ぶ"
            value={condition.genre}
            options={genres}
            onChange={(v) => patch({ genre: v })}
          />
          <ConditionSelect
            label="種別を選ぶ"
            value={condition.kind}
            options={CHANNEL_KINDS.map((k) => ({
              value: k.value,
              label: k.label,
            }))}
            onChange={(v) => patch({ kind: v })}
          />
          <ConditionSelect
            label="チャンネルを選ぶ"
            value={condition.ch}
            options={result.channels}
            onChange={(v) => patch({ ch: v })}
          />
          <ConditionSelect
            label="対象フィールドを選ぶ"
            value={condition.fields}
            options={SEARCH_FIELD_OPTIONS}
            onChange={(v) => patch({ fields: v })}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md bg-tint-sage px-3.5 py-3">
          <div className="min-w-[220px] flex-1">
            <b className="block text-ui font-bold">
              いまの検索条件は、そのまま自動録画ルールの条件になります。
            </b>
            <span className="text-note text-ink-2">
              キーワード・除外キーワード・対象フィールド・ジャンル・チャンネルがルールへ引き継がれます。
            </span>
          </div>
          <Button size="sm" disabled title="ルール作成はこれから実装されます">
            <PlusIcon />
            この条件でルールを作る
          </Button>
        </div>
      </section>

      {!hasCondition ? (
        <EmptyState
          spot="antenna"
          title="まだ検索していません"
          className="mx-auto mt-10 max-w-[560px]"
        >
          条件を組み立てて検索してください。検索の対象は放送予定の番組です。放送が終了した番組は結果に出ません。
        </EmptyState>
      ) : hits.length === 0 ? (
        <EmptyState
          spot="antenna"
          title="条件に合う番組がありません"
          className="mx-auto mt-10 max-w-[560px]"
          action={
            <Button
              size="sm"
              onClick={() =>
                patch({
                  q: null,
                  exclude: null,
                  fields: null,
                  genre: null,
                  kind: null,
                  ch: null,
                })
              }
            >
              条件をすべて消す
            </Button>
          }
        >
          全角と半角、囲み文字の違いは自動でそろえてから照合します。条件を減らすと見つかることがあります。
        </EmptyState>
      ) : (
        <>
          <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
            <h2 className="heading flex items-center gap-1.5 text-[15px]">
              <ListIcon className="size-4 text-brand" />
              検索結果
            </h2>
            <span className="text-sub text-ink-2">
              全 <b className="font-code font-medium text-ink">{hits.length}</b>{' '}
              件
            </span>
          </div>
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <table className="w-full min-w-[760px] border-separate border-spacing-0">
              <thead>
                <tr>
                  {['チャンネル', '放送日時', '番組', 'ジャンル'].map((h) => (
                    <th
                      key={h}
                      className="bg-surface-2 px-3.5 py-[9px] text-left text-[10.5px] font-bold tracking-[0.05em] whitespace-nowrap text-ink-3 first:rounded-l-md last:rounded-r-md"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hits.map((p) => (
                  <tr key={p.id} className="group">
                    <td className="border-b border-dashed border-line px-3.5 py-3 align-top text-ui whitespace-nowrap">
                      {p.channelName}
                      <small className="ml-1.5 font-code text-[10.5px] text-ink-3">
                        {p.channelNo}
                      </small>
                    </td>
                    <td className="border-b border-dashed border-line px-3.5 py-3 align-top font-code text-ui whitespace-nowrap text-ink-2">
                      <b className="mr-1.5 font-medium text-ink">
                        {p.dayLabel}
                      </b>
                      {p.startLabel}–{p.endUndecided ? '終了未定' : p.endLabel}
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
        </>
      )}
    </main>
  )
}
