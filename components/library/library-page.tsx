'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { Route } from 'next'

import type {
  RecordingsFilter,
  RecordingsResult,
} from '@/repository/recordings'
import { RECORDING_STATE_FILTERS } from '@/lib/recordings'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/vela/empty-state'
import { LibraryIcon, ListIcon, SearchIcon } from '@/components/vela/icons'
import { ChannelChip } from '@/components/library/channel-chip'
import { LibraryFilterSelect } from '@/components/library/library-filter-select'
import { RecordingsTable } from '@/components/library/recordings-table'

export function LibraryView({
  result,
  filter,
}: {
  result: RecordingsResult
  filter: RecordingsFilter
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const onFiltersChange = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(patch)) {
        if (value == null || value === '') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }
      const qs = params.toString()
      router.replace((qs ? `${pathname}?${qs}` : pathname) as Route, {
        scroll: false,
      })
    },
    [router, pathname, searchParams],
  )
  const { items, total, channels, years, genres } = result
  const hasFilter = Boolean(
    filter.q || filter.year || filter.genre || filter.state || filter.ch,
  )

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-3.5 pt-6 pb-16 min-[701px]:px-5 min-[1061px]:px-[30px]">
      <div className="mb-4 flex flex-wrap items-baseline gap-3.5">
        <h1 className="heading flex items-center gap-2 text-[20px]">
          <LibraryIcon className="size-[18px] text-brand" />
          録画ライブラリ
        </h1>
        <p className="text-sub text-ink-2">
          録ったものを新しい順に並べます。行を押すと録画詳細へ移動します。
        </p>
      </div>

      <div className="mb-3.5 rounded-lg bg-surface px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <form
            className="relative min-w-[180px] flex-[1_1_100%] min-[701px]:flex-[0_1_268px]"
            onSubmit={(e) => {
              e.preventDefault()
              const q = new FormData(e.currentTarget).get('q')
              onFiltersChange({ q: typeof q === 'string' ? q : null })
            }}
          >
            {/*
              Above the field, which its own label now raises: the label carries
              the press area and is positioned to sit over what it reaches past,
              which would otherwise paint the field's surface over this mark.
              It answers no press either way — the press belongs to the field.
            */}
            <SearchIcon className="pointer-events-none absolute top-1/2 left-[13px] z-10 size-[15px] -translate-y-1/2 text-ink-3" />
            <Input
              key={filter.q ?? ''}
              name="q"
              defaultValue={filter.q ?? ''}
              placeholder="番組名・概要・出演者で検索"
              className="h-[33px] rounded-full pl-[34px]"
            />
          </form>
          <LibraryFilterSelect
            prefix="期間"
            value={filter.year}
            options={years.map((y) => ({ value: String(y), label: `${y} 年` }))}
            onChange={(next) => onFiltersChange({ year: next })}
          />
          <LibraryFilterSelect
            prefix="ジャンル"
            value={filter.genre}
            options={genres.map((g) => ({ value: g, label: g }))}
            onChange={(next) => onFiltersChange({ genre: next })}
          />
          <LibraryFilterSelect
            prefix="状態"
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
                <b className="font-code font-medium text-ink">{items.length}</b>{' '}
                件 / 全{' '}
                <b className="font-code font-medium text-ink">{total}</b> 件
              </>
            ) : (
              <>
                全 <b className="font-code font-medium text-ink">{total}</b> 件
              </>
            )}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2.5 border-t border-dashed border-line pt-3">
          <span className="text-cap font-bold tracking-[0.04em] text-ink-3">
            チャンネル
          </span>
          {/* Every chip is wider than 44px, so only the wrapped rows have to be
              held apart: 31px tall plus 13px is a 44px pitch. */}
          <div className="flex min-w-0 flex-wrap gap-x-1.5 gap-y-[13px]">
            <ChannelChip
              label="すべて"
              on={!filter.ch}
              onClick={() => onFiltersChange({ ch: null })}
            />
            {channels.map((ch) => (
              <ChannelChip
                key={ch}
                label={ch}
                on={filter.ch === ch}
                onClick={() => onFiltersChange({ ch })}
              />
            ))}
          </div>
        </div>
      </div>

      {items.length > 0 ? (
        <>
          <RecordingsTable items={items} />
          {!hasFilter && (
            <div className="mt-3.5 flex flex-wrap items-center gap-2.5 text-note text-ink-3">
              <ListIcon className="size-3.5 shrink-0" />
              <span>
                新しい順に{' '}
                <b className="font-code font-medium text-ink-2">
                  {items.length}
                </b>{' '}
                件すべてを表示しています。サイズは観測値で、括弧内の時刻に確認したものです
              </span>
            </div>
          )}
        </>
      ) : hasFilter ? (
        <EmptyState
          spot="tape"
          title="条件に合う録画がありません"
          titleLevel={2}
          className="mx-auto mt-10 max-w-[560px]"
          action={
            <div className="flex flex-wrap justify-center gap-2.5">
              <Button
                variant="default"
                size="sm"
                onClick={() =>
                  onFiltersChange({
                    q: null,
                    year: null,
                    genre: null,
                    state: null,
                    ch: null,
                  })
                }
              >
                絞り込みを解除
              </Button>
              {filter.q &&
                (filter.year || filter.genre || filter.state || filter.ch) && (
                  <Button
                    variant="ghost"
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
                    キーワードだけ残す
                  </Button>
                )}
            </div>
          }
        >
          キーワードは番組名・概要・詳細(出演者を含む)を対象に探しています。
          全角と半角、囲み文字の違いは自動でそろえてから照合します。条件を減らすと見つかることがあります。
        </EmptyState>
      ) : (
        <EmptyState
          spot="antenna"
          title="まだ録画がありません"
          titleLevel={2}
          className="mx-auto mt-10 max-w-[560px]"
          action={
            <div className="flex flex-wrap justify-center gap-2.5">
              <Button variant="default" size="sm" asChild>
                <Link href="/guide">番組表から予約する</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/reservations">予約一覧を見る</Link>
              </Button>
            </div>
          }
        >
          予約した番組の録画が終わると、ここに新しい順で並びます。
          各行は「録れたか(結果)」と「壊れていないか(品質)」を別々に申告します。
        </EmptyState>
      )}
    </main>
  )
}
