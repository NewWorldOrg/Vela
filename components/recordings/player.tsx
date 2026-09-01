'use client'

import { useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { formatBytes, formatPlayhead } from '@/lib/format'
import type { RecordingDetail } from '@/repository/recordings'
import type { PlaybackPlan, TicketWrite } from '@/repository/videos'
import { videoPictureHref, videoFrameHref } from '@/repository/video-paths'
import { PlayIcon } from '@/components/vela/icons'
import { Spinner } from '@/components/vela/progress'
import {
  PLAYER_BUTTON,
  PLAYER_PALETTE,
} from '@/components/recordings/player-palette'
import { PlayerSegmentedControl } from '@/components/recordings/player-segmented-control'
import { PlayerSeek } from '@/components/recordings/player-seek'
import { PlaybackStandingChip } from '@/components/recordings/playback-standing'
import { PlaybackNotice } from '@/components/recordings/playback-notice'
import { ExternalPlayer } from '@/components/recordings/external-player'
import { pressable, still } from '@/components/vela/tactile'

const PTOG = PLAYER_BUTTON
const PTOG_ON =
  'bg-[rgba(150,187,180,.22)] border-[rgba(150,187,180,.55)] text-[#C0D8D3]'
const CBTN = cn(
  'tap-target flex size-8 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/5 text-(--pl-ink-2) transition-[translate,background-color] duration-150 ease-toy hover:bg-white/15 hover:text-(--pl-ink) hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px disabled:opacity-40 disabled:hover:bg-white/5 disabled:hover:text-(--pl-ink-2) [&_svg]:size-4 [&_svg]:transition-transform [&_svg]:duration-150 [&_svg]:ease-toy hover:[&_svg]:-rotate-6 hover:[&_svg]:scale-110',
  pressable,
  still,
)
const NOT_YET = '再生はこれから実装されます'

/** What the picture is doing. */
type Phase = 'idle' | 'waiting' | 'playing' | 'paused' | 'broken'

/**
 * The recording, played.
 *
 * The plan is read before any picture is asked for, so the screen knows how
 * the recording ended, which route the picture comes by and what a change of
 * position costs, before a frame is requested. Nothing is requested until the
 * play button is pressed: a transcoder starts on the first byte, and a page
 * that asked for one on every visit would start one for every reader who only
 * came to read the record.
 */
export function Player({
  detail: d,
  plan,
  onTakeTicket,
  startAt,
  frameHref = videoFrameHref,
  pictureHref = videoPictureHref,
}: {
  detail: RecordingDetail
  plan: PlaybackPlan
  onTakeTicket: (id: string) => Promise<TicketWrite>
  /**
   * The second the page was opened at, which is how a drop in the quality
   * panel is reached. Unset opens the recording at its poster, having asked
   * the API for nothing.
   */
  startAt?: number
  /**
   * Where the pictures come from. The screen takes the API's own paths; a
   * story hands in frames of its own, which is what lets the scrub be drawn
   * in a catalogue that has no API behind it.
   */
  frameHref?: (id: string, at: number) => string
  pictureHref?: (id: string, from: number) => string
}) {
  const encoded = d.encode?.status === 'done'
  const video = useRef<HTMLVideoElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const [subtitles, setSubtitles] = useState(true)
  const [audio, setAudio] = useState('主音声')
  const [speed, setSpeed] = useState('1.0')
  const [otfQuality, setOtfQuality] = useState('720p 3.0 Mbps')
  const [phase, setPhase] = useState<Phase>(
    startAt === undefined ? 'idle' : 'waiting',
  )
  const [muted, setMuted] = useState(false)
  const [from, setFrom] = useState(startAt ?? 0)
  const [position, setPosition] = useState(startAt ?? 0)
  const [source, setSource] = useState(
    startAt === undefined ? undefined : pictureHref(d.id, startAt),
  )

  const duration = d.lengthSec ?? 0
  const onTheFly = plan.transcodes
  const tsLabel =
    d.sizeBytes == null ? '元 TS' : `元 TS ${formatBytes(d.sizeBytes)}`
  const encodedLabel = `H.264 ${d.encodePanel?.outSize ?? ''}`.trim()
  const drops = d.qualitySpots?.map((spot) => spot.second)

  /**
   * Ask for the picture from a second in. The source is state rather than a
   * call on the element: every change of position is a new request when the
   * picture is made as it plays, so the element is told where to read from and
   * plays from there, and nothing has to be kept in step by hand.
   */
  const play = (second: number) => {
    setFrom(second)
    setPosition(second)
    setPhase('waiting')
    setSource(pictureHref(d.id, second))
  }

  const toggle = () => {
    const element = video.current

    if (phase === 'idle' || phase === 'broken' || !element || !source) {
      play(position)

      return
    }

    if (element.paused) {
      void element.play().catch(() => setPhase('paused'))

      return
    }

    element.pause()
  }

  const choose = (second: number) => {
    // A stream handed over as it is answers a byte range, so the position moves
    // inside the picture already loaded. One made as it plays does not: the
    // second chosen is a new request, and the transcoder behind it is built
    // again.
    if (plan.seeking === 'byRange' && video.current && source) {
      video.current.currentTime = second
      setPosition(second)

      return
    }

    play(second)
  }

  if (phase === 'broken') {
    return (
      <div className="mx-[30px] max-[1060px]:mx-5 max-[700px]:mx-3.5">
        <PlaybackNotice
          tone="gone"
          mark={<PlayIcon className="size-[22px]" />}
          title="再生を開始できませんでした"
          body="元 TS からのトランスコードに失敗しました。時間をおいて再試行するか、外部プレイヤーで開いてください。"
        >
          <button
            type="button"
            onClick={() => play(position)}
            className={PLAYER_BUTTON}
          >
            再試行
          </button>
          <ExternalPlayer id={d.id} onTakeTicket={onTakeTicket} />
        </PlaybackNotice>
      </div>
    )
  }

  return (
    <section
      style={PLAYER_PALETTE}
      className="mx-[30px] overflow-hidden rounded-xl border border-line-strong bg-(--pl-bg) shadow-pop-xl max-[1060px]:mx-5 max-[700px]:mx-3.5"
    >
      <div
        ref={frame}
        className="relative mx-auto flex aspect-video w-[757.33px] max-w-full items-center justify-center bg-(--pl-video)"
      >
        <video
          ref={video}
          src={source}
          autoPlay={source !== undefined}
          poster={d.thumbnailHref}
          preload="none"
          playsInline
          onLoadedData={() =>
            setPhase((was) => (was === 'waiting' ? 'paused' : was))
          }
          onPlaying={() => setPhase('playing')}
          onWaiting={() => setPhase('waiting')}
          onPause={() =>
            setPhase((was) => (was === 'waiting' ? was : 'paused'))
          }
          onEnded={() => setPhase('paused')}
          onError={() => setPhase('broken')}
          onTimeUpdate={(event) =>
            setPosition(from + event.currentTarget.currentTime)
          }
          className="size-full object-contain"
        />
        {phase === 'idle' && (
          <button
            type="button"
            onClick={toggle}
            aria-label="再生"
            className={cn(
              'absolute inset-0 flex items-center justify-center bg-transparent',
              pressable,
            )}
          >
            <span className="flex size-[72px] items-center justify-center rounded-full border-[1.5px] border-white/60 opacity-70 transition-opacity duration-150 hover:opacity-100">
              <PlayIcon className="ml-[3px] size-[27px] text-white/90" />
            </span>
          </button>
        )}
        {phase === 'waiting' && (
          <p
            role="status"
            className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2 text-sub text-(--pl-ink-2)"
          >
            <Spinner className="text-(--pl-accent)" />
            絵が出るまで数秒かかります
          </p>
        )}
      </div>
      <div className="px-6 pt-2 pb-4 max-[700px]:px-4">
        <div className="pt-1.5">
          <PlaybackStandingChip standing={plan.standing} />
        </div>
        {duration > 0 && (
          <PlayerSeek
            id={d.id}
            duration={duration}
            position={position}
            drops={drops}
            marks={d.seek}
            seeking={plan.seeking}
            onChoose={choose}
            frameHref={frameHref}
          />
        )}
        <div className="mt-[9px] flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-label={phase === 'playing' ? '一時停止' : '再生'}
            onClick={toggle}
            className={CBTN}
          >
            {phase === 'playing' ? (
              <svg
                viewBox="0 0 24 24"
                className="fill-none stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]"
              >
                <path d="M9.4 5.8v12.4M14.6 5.8v12.4" />
              </svg>
            ) : (
              <PlayIcon />
            )}
          </button>
          <span className="font-code text-sub whitespace-nowrap text-(--pl-ink-2)">
            {formatPlayhead(position)} / {formatPlayhead(duration)}
          </span>
          <button
            type="button"
            onClick={() => setSubtitles(!subtitles)}
            aria-pressed={subtitles}
            className={cn(PTOG, subtitles && PTOG_ON)}
          >
            字幕
          </button>
          {d.seek?.chapterPcts && (
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
              onChange={(next) => {
                setSpeed(next)

                if (video.current) {
                  video.current.playbackRate = Number(next)
                }
              }}
              numeric
            />
          </div>
          {(d.seek?.cmSpans || (drops && drops.length > 0)) && (
            <div className="ml-auto flex flex-wrap items-center gap-4 max-[700px]:ml-0">
              {d.seek?.cmSpans && (
                <span className="inline-flex items-center gap-[7px] text-[11px] text-(--pl-ink-3)">
                  <i className="inline-block h-[5px] w-4 rounded-full [background:repeating-linear-gradient(115deg,rgba(215,172,94,.62)_0_4px,rgba(215,172,94,.26)_4px_8px)]" />
                  CM と判定された区間 — 飛ばすかは自分で決めます
                </span>
              )}
              {drops && drops.length > 0 && (
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
            aria-pressed={muted}
            onClick={() => {
              const element = video.current

              if (element) {
                element.muted = !element.muted
                setMuted(element.muted)
              }
            }}
            className={cn(CBTN, muted && PTOG_ON)}
          >
            <svg
              viewBox="0 0 24 24"
              className="fill-none stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]"
            >
              <path d="M11.2 5.2 6.7 9.1H3.2v5.9h3.5l4.5 3.9V5.2Z" />
              {muted ? (
                <path d="M15.2 9.4 19.6 14.6M19.6 9.4 15.2 14.6" />
              ) : (
                <path d="M15 9.3a3.7 3.7 0 0 1 .1 5.5" />
              )}
            </svg>
          </button>
          <button
            type="button"
            aria-label="全画面"
            onClick={() => void frame.current?.requestFullscreen?.()}
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
              <span
                role="group"
                aria-label="再生ソース"
                className="inline-flex gap-1 rounded-full border border-white/20 p-0.5"
              >
                {[encodedLabel, tsLabel].map((label, index) => {
                  const inUse = index === (onTheFly ? 1 : 0)

                  return (
                    <span
                      key={label}
                      aria-current={inUse ? 'true' : undefined}
                      className={cn(
                        'rounded-full px-[11px] py-[3px] font-code text-[11.5px] font-medium whitespace-nowrap text-(--pl-ink-2)',
                        inUse &&
                          'bg-[rgba(150,187,180,.24)] font-bold text-[#C0D8D3]',
                      )}
                    >
                      {label}
                    </span>
                  )
                })}
              </span>
            ) : (
              <span className="font-code text-[11.5px] text-(--pl-ink-2)">
                {tsLabel}(オンザフライ)
              </span>
            )}
          </div>
          <p className="min-w-[220px] flex-1 text-[11.5px] leading-relaxed text-(--pl-ink-3)">
            {!onTheFly ? (
              <>
                <b className="block font-bold text-(--pl-ink-2)">
                  エンコード済みを再生しています。
                </b>
                Range 直配信のため、シークはバイト範囲の要求だけで済みます。
              </>
            ) : encoded ? (
              <>
                <b className="block font-bold text-(--pl-ink-2)">
                  元 TS を再生しています。
                </b>
                シークのたびにトランスコーダを立て直します。
              </>
            ) : d.encode?.status === 'failed' ? (
              <>
                <b className="block font-bold text-(--pl-ink-2)">
                  エンコードは失敗したため、元 TS をオンザフライで再生します。
                </b>
                シークのたびにトランスコーダを立て直すため、シーク後に絵が出るまで数秒かかります。
              </>
            ) : (
              <>
                <b className="block font-bold text-(--pl-ink-2)">
                  未エンコードの録画を再生しています。
                </b>
                シークのたびにトランスコーダを立て直すため、シーク後に絵が出るまで数秒かかります。エンコード済みの成果物があれば
                Range 直配信になり、同じシークバーでも体感が桁違いになります。
              </>
            )}
          </p>
          <ExternalPlayer
            id={d.id}
            onTakeTicket={onTakeTicket}
            video={video}
            className="ml-auto max-[700px]:ml-0"
          />
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
