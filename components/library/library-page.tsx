'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { Route } from 'next'

import type {
  RecordingDiscarded,
  RecordingsFilter,
  RecordingsResult,
} from '@/repository/recordings'
import { cn } from '@/lib/utils'
import { RECORDING_STATE_FILTERS } from '@/lib/recordings'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/vela/empty-state'
import { BAND_CONTROL, FilterSelect } from '@/components/vela/filter-select'
import { LibraryIcon, SearchIcon } from '@/components/vela/icons'
import { ChannelChip } from '@/components/library/channel-chip'
import { RecordingsTable } from '@/components/library/recordings-table'
import { ScreenMain } from '@/components/vela/app-shell'

export function LibraryView({
  result,
  filter,
  onDelete,
}: {
  result: RecordingsResult
  filter: RecordingsFilter
  onDelete: (id: string) => Promise<RecordingDiscarded>
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
  const clearEveryCondition = (): void =>
    onFiltersChange({
      q: null,
      year: null,
      genre: null,
      state: null,
      ch: null,
    })

  return (
    <ScreenMain
      scroll="within"
      className="flex flex-col px-3.5 pt-6 pb-6 min-[701px]:px-5 min-[1061px]:px-[calc(30rem/16)]"
    >
      <div className="mb-4 flex flex-wrap items-baseline gap-3.5">
        <h1 className="heading flex items-center gap-2 text-[calc(20rem/16)]">
          <LibraryIcon className="size-[calc(18rem/16)] text-brand" />
          録画ライブラリ
        </h1>
      </div>

      <div className="mb-3.5 rounded-lg bg-surface px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <form
            className="relative min-w-[calc(180rem/16)] flex-[1_1_100%] min-[701px]:flex-[0_1_268px]"
            onSubmit={(e) => {
              e.preventDefault()
              const q = new FormData(e.currentTarget).get('q')
              onFiltersChange({ q: typeof q === 'string' ? q : null })
            }}
          >
            <SearchIcon className="pointer-events-none absolute top-1/2 left-[calc(13rem/16)] z-10 size-[calc(15rem/16)] -translate-y-1/2 text-ink-3" />
            <Input
              key={filter.q ?? ''}
              name="q"
              defaultValue={filter.q ?? ''}
              placeholder="番組名・概要・出演者で検索"
              className={cn(BAND_CONTROL, 'rounded-full pl-[calc(34rem/16)]')}
            />
          </form>
          <FilterSelect
            prefix="期間"
            value={filter.year}
            options={years.map((y) => ({ value: String(y), label: `${y} 年` }))}
            onChange={(next) => onFiltersChange({ year: next })}
          />
          <FilterSelect
            prefix="ジャンル"
            value={filter.genre}
            options={genres.map((g) => ({ value: g, label: g }))}
            onChange={(next) => onFiltersChange({ genre: next })}
          />
          <FilterSelect
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
          {hasFilter && (
            <Button variant="halt" size="sm" onClick={clearEveryCondition}>
              条件を消す
            </Button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2.5 border-t border-dashed border-line pt-3">
          <span className="text-cap font-bold tracking-[0.04em] text-ink-3">
            チャンネル
          </span>
          <div className="flex min-w-0 flex-wrap gap-x-1.5 gap-y-[calc(13rem/16)]">
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
        <RecordingsTable items={items} onDelete={onDelete} />
      ) : hasFilter ? (
        <EmptyState
          spot="tape"
          title="条件に合う録画がありません"
          titleLevel={2}
          className="mt-10 max-w-[calc(560rem/16)]"
          action={
            <div className="flex flex-wrap justify-center gap-2.5">
              <Button variant="halt" size="sm" onClick={clearEveryCondition}>
                条件を消す
              </Button>
              {filter.q &&
                (filter.year || filter.genre || filter.state || filter.ch) && (
                  <Button
                    variant="change"
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
        />
      ) : (
        <EmptyState
          spot="antenna"
          title="まだ録画がありません"
          titleLevel={2}
          className="mt-10 max-w-[calc(560rem/16)]"
          action={
            <div className="flex flex-wrap justify-center gap-2.5">
              <Button variant="watch" size="sm" asChild>
                <Link href="/guide">番組表から予約する</Link>
              </Button>
              <Button variant="watch" size="sm" asChild>
                <Link href="/reservations">予約一覧を見る</Link>
              </Button>
            </div>
          }
        />
      )}
    </ScreenMain>
  )
}
