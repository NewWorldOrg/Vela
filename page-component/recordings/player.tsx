'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'
import { formatBytes } from '@/lib/format'
import type { RecordingDetail } from '@/repository/recordings'
import { PlayIcon } from '@/components/vela/icons'
import {
  PLAYER_BUTTON,
  PLAYER_PALETTE,
} from '@/feature/recordings/player-palette'
import { PlayerSegmentedControl } from '@/feature/recordings/player-segmented-control'

const PTOG = PLAYER_BUTTON
const PTOG_ON =
  'bg-[rgba(150,187,180,.22)] border-[rgba(150,187,180,.55)] text-[#C0D8D3]'
const CBTN =
  'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-white/5 text-(--pl-ink-2) transition-[translate,background-color] duration-150 ease-toy hover:bg-white/15 hover:text-(--pl-ink) hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-0 disabled:hover:bg-white/5 [&_svg]:size-4 [&_svg]:transition-transform [&_svg]:duration-150 [&_svg]:ease-toy hover:[&_svg]:-rotate-6 hover:[&_svg]:scale-110'
const NOT_YET = '再生はこれから実装されます'

export function Player({ detail: d }: { detail: RecordingDetail }) {
  const encoded = d.encode.status === 'done'
  const [subtitles, setSubtitles] = useState(true)
  const [audio, setAudio] = useState('主音声')
  const [speed, setSpeed] = useState('1.0')
  const [source, setSource] = useState<'encoded' | 'ts'>(
    encoded ? 'encoded' : 'ts',
  )
  const [otfQuality, setOtfQuality] = useState('720p 3.0 Mbps')
  const seek = d.seek
  const onTheFly = !encoded || source === 'ts'
  const tsLabel = `元 TS ${formatBytes(d.sizeBytes)}`

  return (
    <section
      style={PLAYER_PALETTE}
      className="mx-[30px] overflow-hidden rounded-xl border border-line-strong bg-(--pl-bg) shadow-pop-xl max-[1060px]:mx-5 max-[700px]:mx-3.5"
    >
      <div className="relative mx-auto flex aspect-video w-[757.33px] max-w-full items-center justify-center bg-(--pl-video)">
        <span
          aria-hidden="true"
          className="flex size-[72px] items-center justify-center rounded-full border-[1.5px] border-white/60 opacity-60"
        >
          <PlayIcon className="ml-[3px] size-[27px] text-white/90" />
        </span>
      </div>
      <div className="px-6 pt-2 pb-4 max-[700px]:px-4">
        {seek && (
          <div className="relative mt-2 h-[18px]">
            <div className="absolute top-[7px] right-0 left-0 h-[5px] rounded-full bg-white/15" />
            <div
              className="absolute top-[7px] left-0 h-[5px] rounded-full bg-(--pl-accent)"
              style={{ width: `${seek.playedPct}%` }}
            />
            {seek.cmSpans?.map((c) => (
              <span
                key={c.leftPct}
                className="absolute top-[7px] h-[5px] rounded-full [background:repeating-linear-gradient(115deg,rgba(215,172,94,.62)_0_4px,rgba(215,172,94,.26)_4px_8px)]"
                style={{ left: `${c.leftPct}%`, width: `${c.widthPct}%` }}
              />
            ))}
            {seek.chapterPcts?.map((p) => (
              <span
                key={p}
                className="absolute top-px -ml-px h-[17px] w-0.5 rounded-[1px] bg-(--pl-lemon) opacity-85"
                style={{ left: `${p}%` }}
              />
            ))}
            {seek.dropPcts?.map((p) => (
              <span
                key={p}
                className="absolute top-[5px] -ml-1 size-2 rounded-full bg-(--pl-coral)"
                style={{ left: `${p}%` }}
              />
            ))}
            <span
              className="absolute top-[2.5px] -ml-[7px] size-3.5 rounded-full border-2 border-(--pl-accent) bg-white"
              style={{ left: `${seek.playedPct}%` }}
            />
          </div>
        )}
        <div className="mt-[9px] flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            aria-label="再生"
            disabled
            title={NOT_YET}
            className={CBTN}
          >
            <PlayIcon />
          </button>
          {seek && (
            <span className="font-code text-sub whitespace-nowrap text-(--pl-ink-2)">
              {seek.time}
            </span>
          )}
          <button
            type="button"
            onClick={() => setSubtitles(!subtitles)}
            aria-pressed={subtitles}
            className={cn(PTOG, subtitles && PTOG_ON)}
          >
            字幕
          </button>
          {seek?.chapterPcts && (
            <button type="button" disabled title={NOT_YET} className={PTOG}>
              次のチャプターへ
              <span className="ml-1.5 inline-block rounded border border-white/20 px-1 font-code text-[11px] leading-normal text-(--pl-ink-3)">
                →
              </span>
            </button>
          )}
          <div className="inline-flex flex-wrap items-center gap-2">
            <span className="text-[11px] whitespace-nowrap text-(--pl-ink-3)">
              音声
            </span>
            <PlayerSegmentedControl
              label="音声"
              options={['主音声', '副音声']}
              value={audio}
              onChange={setAudio}
            />
          </div>
          <div className="inline-flex flex-wrap items-center gap-2">
            <span className="text-[11px] whitespace-nowrap text-(--pl-ink-3)">
              速度
            </span>
            <PlayerSegmentedControl
              label="速度"
              options={['0.5', '1.0', '1.25', '1.5', '2.0']}
              value={speed}
              onChange={setSpeed}
              numeric
            />
          </div>
          {(seek?.cmSpans || seek?.dropPcts) && (
            <div className="ml-auto flex flex-wrap items-center gap-4 max-[700px]:ml-0">
              {seek.cmSpans && (
                <span className="inline-flex items-center gap-[7px] text-[11px] text-(--pl-ink-3)">
                  <i className="inline-block h-[5px] w-4 rounded-full [background:repeating-linear-gradient(115deg,rgba(215,172,94,.62)_0_4px,rgba(215,172,94,.26)_4px_8px)]" />
                  CM と判定された区間 — 飛ばすかは自分で決めます
                </span>
              )}
              {seek.dropPcts && (
                <span className="inline-flex items-center gap-[7px] text-[11px] text-(--pl-ink-3)">
                  <i className="inline-block size-2 rounded-full bg-(--pl-coral)" />
                  ドロップ発生位置
                </span>
              )}
            </div>
          )}
          <button
            type="button"
            aria-label="音量"
            disabled
            title={NOT_YET}
            className={CBTN}
          >
            <svg
              viewBox="0 0 24 24"
              className="fill-none stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]"
            >
              <path d="M11.2 5.2 6.7 9.1H3.2v5.9h3.5l4.5 3.9V5.2Z" />
              <path d="M15 9.3a3.7 3.7 0 0 1 .1 5.5" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="全画面"
            disabled
            title={NOT_YET}
            className={CBTN}
          >
            <svg
              viewBox="0 0 24 24"
              className="fill-none stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]"
            >
              <path d="M4.3 9.4V4.3h5.1M19.7 9.4V4.3h-5.1M4.3 14.6v5.1h5.1M19.7 14.6v5.1h-5.1" />
            </svg>
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3.5 border-t border-dashed border-white/15 pt-3">
          <div className="flex flex-wrap items-center gap-[9px]">
            <span className="text-[11px] text-(--pl-ink-3)">再生ソース</span>
            {encoded ? (
              <PlayerSegmentedControl
                label="再生ソース"
                options={[
                  `H.264 ${d.encodePanel?.outSize ?? ''}`.trim(),
                  tsLabel,
                ]}
                value={
                  source === 'encoded'
                    ? `H.264 ${d.encodePanel?.outSize ?? ''}`.trim()
                    : tsLabel
                }
                onChange={(next) =>
                  setSource(next.startsWith('H.264') ? 'encoded' : 'ts')
                }
                numeric
              />
            ) : (
              <span className="font-code text-[11.5px] text-(--pl-ink-2)">
                {tsLabel}(オンザフライ)
              </span>
            )}
          </div>
          <p className="min-w-[220px] flex-1 text-[11.5px] leading-relaxed text-(--pl-ink-3)">
            {!onTheFly ? (
              <>
                <b className="font-bold text-(--pl-ink-2)">
                  エンコード済みを再生しています。
                </b>
                Range 直配信のため、シークはバイト範囲の要求だけで済みます。元
                TS
                を選ぶとオンザフライになり、シークのたびにトランスコーダを立て直します。
              </>
            ) : encoded ? (
              <>
                <b className="font-bold text-(--pl-ink-2)">
                  元 TS を再生しています。
                </b>
                シークのたびにトランスコーダを立て直します。H.264 を選ぶと Range
                直配信になります。
              </>
            ) : d.encode.status === 'failed' ? (
              <>
                <b className="font-bold text-(--pl-ink-2)">
                  エンコードは失敗したため、元 TS をオンザフライで再生します。
                </b>
                シークのたびにトランスコーダを立て直すため、シーク後に絵が出るまで数秒かかります。
              </>
            ) : (
              <>
                <b className="font-bold text-(--pl-ink-2)">
                  未エンコードの録画を再生しています。
                </b>
                シークのたびにトランスコーダを立て直すため、シーク後に絵が出るまで数秒かかります。エンコード済みの成果物があれば
                Range 直配信になり、同じシークバーでも体感が桁違いになります。
              </>
            )}
          </p>
          <div className="ml-auto flex flex-wrap gap-2 max-[700px]:ml-0">
            <button type="button" disabled title={NOT_YET} className={PTOG}>
              外部プレイヤーで開く
            </button>
            <button type="button" disabled title={NOT_YET} className={PTOG}>
              AirPlay
            </button>
          </div>
        </div>
        {onTheFly && (
          <div className="mt-3 flex flex-wrap items-center gap-[9px] border-t border-dashed border-white/15 pt-3">
            <span className="text-[11px] text-(--pl-ink-3)">画質</span>
            <PlayerSegmentedControl
              label="画質"
              options={['1080p 6.0 Mbps', '720p 3.0 Mbps', '480p 1.5 Mbps']}
              value={otfQuality}
              onChange={setOtfQuality}
              numeric
            />
            <span className="text-[11px] text-(--pl-ink-3)">
              オンザフライ再生のときだけ選べます
            </span>
          </div>
        )}
      </div>
    </section>
  )
}
