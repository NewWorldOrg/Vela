'use client'

import { useCallback, useState } from 'react'
import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { cn } from '@/lib/utils'
import type { LiveResult } from '@/repository/live'
import { Badge } from '@/components/ui/badge'
import {
  PLAYER_BUTTON,
  PLAYER_PALETTE,
} from '@/components/recordings/player-palette'
import { PlayerSegmentedControl } from '@/components/recordings/player-segmented-control'
import { PlayIcon, QualityIcon } from '@/components/vela/icons'

const NOT_YET = '再生はこれから実装されます'

/** What the player offers to switch between, until the stream says otherwise. */
const LIVE_QUALITIES = ['1080p 6.0 Mbps', '720p 3.0 Mbps', '480p 1.5 Mbps']

export function LiveView({ live }: { live: LiveResult }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [subtitles, setSubtitles] = useState(true)
  const [data, setData] = useState(false)
  const [quality, setQuality] = useState(LIVE_QUALITIES[1])
  const [audio, setAudio] = useState('主音声')

  const select = useCallback(
    (channelId: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('ch', channelId)
      router.replace(`${pathname}?${params.toString()}` as Route, {
        scroll: false,
      })
    },
    [router, pathname, searchParams],
  )

  return (
    <main className="flex min-h-0 flex-1 items-start gap-3.5 overflow-y-auto px-3.5 pt-4 pb-10 min-[701px]:px-5 min-[1061px]:px-[30px] max-[1060px]:flex-col">
      <div className="min-w-0 flex-1">
        <section
          style={PLAYER_PALETTE}
          className="overflow-hidden rounded-xl border border-line-strong bg-(--pl-bg) shadow-pop-xl"
        >
          <div className="relative flex aspect-video items-center justify-center bg-(--pl-video)">
            <span className="absolute top-3 left-3 rounded-full bg-black/45 px-3 py-1 text-[11.5px] text-(--pl-ink)">
              <b className="font-code font-medium">{live.channelNo}</b>{' '}
              {live.channelName} · 生放送
            </span>
            <span
              aria-hidden="true"
              className="flex size-[72px] items-center justify-center rounded-full border-[1.5px] border-white/60 opacity-60"
            >
              <PlayIcon className="ml-[3px] size-[27px] text-white/90" />
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 px-6 pt-3 max-[700px]:px-4">
            <button
              type="button"
              onClick={() => setSubtitles(!subtitles)}
              aria-pressed={subtitles}
              className={cn(
                PLAYER_BUTTON,
                subtitles &&
                  'border-[rgba(150,187,180,.55)] bg-[rgba(150,187,180,.22)] text-[#C0D8D3]',
              )}
            >
              字幕
            </button>
            <button
              type="button"
              onClick={() => setData(!data)}
              aria-pressed={data}
              className={cn(
                PLAYER_BUTTON,
                data &&
                  'border-[rgba(150,187,180,.55)] bg-[rgba(150,187,180,.22)] text-[#C0D8D3]',
              )}
            >
              データ放送
            </button>
            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-(--pl-ink-2)">
              <i className="inline-block size-2 rounded-full bg-mint" />
              遅延 <span className="font-code">{live.latencySec}</span> 秒
            </span>
            <span className="ml-auto text-[11.5px] text-(--pl-ink-3) max-[700px]:ml-0">
              ドロップ{' '}
              <b className="font-code text-(--pl-ink-2)">{live.drops}</b> 件
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3.5 px-6 pt-3 pb-4 max-[700px]:px-4">
            <div className="inline-flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-(--pl-ink-3)">画質</span>
              <PlayerSegmentedControl
                label="画質"
                options={LIVE_QUALITIES}
                value={quality}
                onChange={setQuality}
                numeric
              />
            </div>
            <div className="inline-flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-(--pl-ink-3)">音声</span>
              <PlayerSegmentedControl
                label="音声"
                options={['主音声', '副音声']}
                value={audio}
                onChange={setAudio}
              />
            </div>
            <div className="ml-auto flex flex-wrap gap-2 max-[700px]:ml-0">
              <button
                type="button"
                disabled
                title={NOT_YET}
                className={PLAYER_BUTTON}
              >
                外部プレイヤーで開く
              </button>
              <button
                type="button"
                disabled
                title={NOT_YET}
                className={PLAYER_BUTTON}
              >
                AirPlay
              </button>
            </div>
          </div>
          <p className="border-t border-dashed border-white/15 px-6 py-3 text-[11.5px] leading-relaxed text-(--pl-ink-3) max-[700px]:px-4">
            画質を選ぶとセッションが分かれ、
            <b className="font-bold text-(--pl-ink-2)">
              同じ画質を見ている人がいない限りトランスコードが1本増えます
            </b>
            。ドロップはライブ専用の指標で、背圧で捨てた映像の件数です。
            <b className="font-bold text-(--pl-ink-2)">
              録画のドロップ率とは別の指標
            </b>
            のため、品質画面には出しません。外部プレイヤー・AirPlay は使い捨ての
            ticket(有効 <span className="font-code">30</span>{' '}
            秒・1回で失効)で開きます。
          </p>
        </section>

        <section className="mt-3.5 rounded-lg bg-surface px-[18px] py-4">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <span className="font-code text-sub text-ink-3">
              {live.channelNo}
            </span>
            <h1 className="heading text-[18px]">{live.title}</h1>
            <span className="font-code text-ui text-ink-2">
              {live.timeLabel}
            </span>
          </div>
          <p className="mt-0.5 text-sub text-ink-2">{live.channelName}</p>
          <div className="mt-2.5 flex items-center gap-2.5">
            <span className="font-code text-sub text-ink-3">
              {live.nowLabel}
            </span>
            <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-surface-3">
              <i
                className="block h-full rounded-full bg-brand"
                style={{ width: `${live.progressPct}%` }}
              />
            </div>
            <span className="font-code text-sub text-ink-3">
              {live.restLabel}
            </span>
          </div>
          {live.description && (
            <p className="mt-3 text-ui leading-relaxed whitespace-pre-wrap text-ink-2">
              {live.description}
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {live.chips.map((c) => (
              <Badge key={c}>{c}</Badge>
            ))}
          </div>
        </section>

        <section className="mt-3.5 rounded-lg bg-surface px-[18px] py-4">
          <h2 className="heading flex items-center gap-1.5 text-[15px]">
            <QualityIcon className="size-4 text-brand" />
            遅延の判定
          </h2>
          <ul className="mt-2.5 space-y-1.5 text-ui text-ink-2">
            <li className="flex items-start gap-2">
              <i className="mt-1.5 inline-block size-2 shrink-0 rounded-full bg-mint" />
              <span>
                <b className="font-bold text-ink">3.0 秒以下</b>{' '}
                良好。定常の内訳はフラグメント 0.2 秒 +
                クライアントジッタバッファ 1.0 秒 + ドライバ側 0.025 秒
              </span>
            </li>
            <li className="flex items-start gap-2">
              <i className="mt-1.5 inline-block size-2 shrink-0 rounded-full bg-lemon" />
              <span>
                <b className="font-bold text-ink">3.0 秒 超</b> 再生レート 1.05
                で追い付きます
              </span>
            </li>
            <li className="flex items-start gap-2">
              <i className="mt-1.5 inline-block size-2 shrink-0 rounded-full bg-coral" />
              <span>
                <b className="font-bold text-ink">8.0 秒 超</b> 追い付きをやめて
                live edge へシークします
              </span>
            </li>
          </ul>
          <p className="mt-2.5 text-note leading-relaxed text-ink-3">
            緑ドットの境界 3.0 秒は暫定値です。8.0
            秒は追い付きをやめてシークに切り替える境界で、実装の閾値と同じ値を出しています。
          </p>
        </section>
      </div>

      <aside className="w-[320px] shrink-0 rounded-lg bg-surface px-3 py-3.5 max-[1060px]:w-full">
        <div className="mb-2.5 flex items-center gap-1.5 px-1.5 text-cap font-bold tracking-[0.04em] text-ink-3">
          放送中
          <i className="h-px flex-1 border-t border-dashed border-line not-italic" />
        </div>
        {live.rows.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={r.onAir}
            onClick={() => select(r.id)}
            className={cn(
              'mb-0.5 flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-[background-color] duration-150 hover:bg-surface-2',
              r.onAir && 'bg-brand-soft',
            )}
          >
            <span className="font-code text-sub text-ink-3">{r.no}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sub font-bold">
                {r.name}
              </span>
              <span className="block truncate text-note text-ink-2">
                {r.now}
              </span>
              <span className="block truncate text-note text-ink-3">
                {r.next}
              </span>
            </span>
            {r.onAir && <i className="size-2 shrink-0 rounded-full bg-brand" />}
          </button>
        ))}
      </aside>
    </main>
  )
}
