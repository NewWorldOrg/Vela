'use client'

import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { formatBytes, formatPlayhead } from '@/lib/format'
import type { RecordingDetail } from '@/repository/recordings'
import type { PlaybackPlan, TicketWrite } from '@/repository/videos'
import {
  PLAYBACK_PROFILES,
  PLAYBACK_PROFILE_UNASKED,
  videoPictureHref,
  videoFrameHref,
  type PlaybackProfile,
} from '@/repository/video-paths'
import { PlayIcon } from '@/components/vela/icons'
import { Spinner } from '@/components/vela/progress'
import {
  PLAYER_BUTTON,
  PLAYER_PALETTE,
  PLAYER_PANE,
  PLAYER_PICTURE_PANE,
} from '@/components/recordings/player-palette'
import { PlayerSegmentedControl } from '@/components/recordings/player-segmented-control'
import { PlayerVolume } from '@/components/recordings/player-volume'
import { PlayerSeek } from '@/components/recordings/player-seek'
import { PlaybackStandingChip } from '@/components/recordings/playback-standing'
import {
  askWhyItWouldNotPlay,
  faultOnTheFace,
  PlaybackFaultNotice,
  type PlaybackFault,
} from '@/components/recordings/playback-fault'
import { ExternalPlayer } from '@/components/recordings/external-player'
import { pressable, still } from '@/components/vela/tactile'

const PTOG = PLAYER_BUTTON
const CBTN = cn(
  'tap-target flex size-8 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/5 text-(--pl-ink-2) transition-[translate,background-color] duration-150 ease-toy hover:bg-white/15 hover:text-(--pl-ink) hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px disabled:border-white/12 disabled:bg-white/3 disabled:text-(--pl-ink-3) disabled:hover:border-white/12 disabled:hover:bg-white/3 disabled:hover:text-(--pl-ink-3)',
  pressable,
  still,
)
const CBTN_ON =
  'bg-[rgba(150,187,180,.22)] border-[rgba(150,187,180,.55)] text-[#C0D8D3]'
const NOT_YET = '再生はこれから実装されます'

/**
 * What has no argument on the API yet. The controls stay on the chrome, drawn
 * switched off: taken away they would be missed, and left pressable they would
 * move their own pill over a picture that never changed.
 */
const NOT_WIRED = '字幕と音声の選択はこれから実装されます'

/** What the picture is doing. */
type Phase = 'idle' | 'waiting' | 'playing' | 'paused' | 'diagnosing' | 'broken'

/** What the plate over the picture reads while there is no picture yet. */
const WAITING_ON = {
  waiting: '絵が出るまで数秒かかります',
  diagnosing: '再生できませんでした — 理由の確認中',
} as const

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
  askWhy = askWhyItWouldNotPlay,
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
  pictureHref?: (id: string, from: number, profile?: PlaybackProfile) => string
  /**
   * How the reason a picture would not play is found out. The screen asks the
   * API; a story hands in the answer, which is what lets each reason be drawn
   * and read in a catalogue with no API behind it.
   */
  askWhy?: (href: string, transcodes: boolean) => Promise<PlaybackFault>
}) {
  const encoded = d.encode?.status === 'done'
  const video = useRef<HTMLVideoElement>(null)
  const shell = useRef<HTMLElement>(null)
  const [speed, setSpeed] = useState('1.0')
  const [profile, setProfile] = useState<PlaybackProfile>(
    PLAYBACK_PROFILE_UNASKED,
  )
  const [phase, setPhase] = useState<Phase>(
    startAt === undefined ? 'idle' : 'waiting',
  )
  const [fault, setFault] = useState<PlaybackFault>('transcode')
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [full, setFull] = useState(false)
  const [from, setFrom] = useState(startAt ?? 0)
  const [position, setPosition] = useState(startAt ?? 0)
  const onTheFly = plan.transcodes
  const [source, setSource] = useState(() =>
    startAt === undefined
      ? undefined
      : pictureHref(
          d.id,
          startAt,
          onTheFly ? PLAYBACK_PROFILE_UNASKED : undefined,
        ),
  )

  /**
   * Which attempt an answer belongs to. A reason is asked for over the network
   * and arrives after the press that started it, so an answer about a picture
   * nobody is waiting for any more is dropped rather than drawn.
   */
  const attempt = useRef(0)

  const duration = d.lengthSec ?? 0
  const tsLabel =
    d.sizeBytes == null ? '元 TS' : `元 TS ${formatBytes(d.sizeBytes)}`
  const encodedLabel = `H.264 ${d.encodePanel?.outSize ?? ''}`.trim()
  const drops = d.qualitySpots?.map((spot) => spot.second)

  // useEffect exception: browser API (the document's fullscreen element) +
  // listener cleanup. Leaving fullscreen by Esc is not a press this component
  // sees, and the control that says "leave" is inside the picture now.
  useEffect(() => {
    const read = () => setFull(document.fullscreenElement === shell.current)

    document.addEventListener('fullscreenchange', read)

    return () => document.removeEventListener('fullscreenchange', read)
  }, [])

  /**
   * Ask for the picture from a second in, in the profile asked for. The source
   * is state rather than a call on the element: every change of position is a
   * new request when the picture is made as it plays, so the element is told
   * where to read from and plays from there, and nothing has to be kept in
   * step by hand.
   */
  const play = (second: number, asked: PlaybackProfile = profile) => {
    attempt.current += 1
    setFrom(second)
    setPosition(second)
    setProfile(asked)
    setPhase('waiting')
    setSource(pictureHref(d.id, second, onTheFly ? asked : undefined))
  }

  /**
   * The picture would not play. The element says only that much, so the reason
   * is read off the recording where the recording already answers it, and
   * asked of the API where it does not.
   */
  const stumbled = () => {
    const mine = (attempt.current += 1)
    const onTheFace = faultOnTheFace(d)

    if (onTheFace || !source) {
      setFault(onTheFace ?? 'transcode')
      setPhase('broken')

      return
    }

    setPhase('diagnosing')

    void askWhy(source, onTheFly).then((why) => {
      if (attempt.current !== mine) {
        return
      }

      setFault(why)
      setPhase('broken')
    })
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

  const chooseProfile = (next: string) => {
    const asked = next as PlaybackProfile

    // Nothing has been asked for yet, so choosing a profile is a choice about
    // the request the play button will make, not a reason to make one.
    if (phase === 'idle') {
      setProfile(asked)

      return
    }

    play(position, asked)
  }

  /**
   * How loud. Nought is silence, and silence is the same state the speaker
   * beside the level switches on, so the two say the same thing rather than
   * disagreeing about whether anything can be heard.
   */
  const chooseVolume = (next: number) => {
    const element = video.current

    setVolume(next)
    setMuted(next === 0)

    if (element) {
      element.volume = next
      element.muted = next === 0
    }
  }

  /** Silence, without losing where the level was set. */
  const mute = (quiet: boolean) => {
    const element = video.current
    const level = !quiet && volume === 0 ? 1 : volume

    setMuted(quiet)
    setVolume(level)

    if (element) {
      element.volume = level
      element.muted = quiet
    }
  }

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()

      return
    }

    void shell.current?.requestFullscreen?.()
  }

  if (phase === 'broken') {
    return (
      <div className="mx-[30px] max-[1060px]:mx-5 max-[700px]:mx-3.5">
        <div className={PLAYER_PANE}>
          <PlaybackFaultNotice
            detail={d}
            fault={fault}
            onRetry={() => play(position)}
            onTakeTicket={onTakeTicket}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-[30px] max-[1060px]:mx-5 max-[700px]:mx-3.5">
      <section
        ref={shell}
        style={PLAYER_PALETTE}
        className={cn(
          'overflow-hidden rounded-xl border border-line-strong bg-(--pl-bg) shadow-pop-xl',
          PLAYER_PICTURE_PANE,
          '[&:fullscreen]:flex [&:fullscreen]:max-w-none [&:fullscreen]:flex-col [&:fullscreen]:rounded-none [&:fullscreen]:border-0 [&:fullscreen]:shadow-none',
        )}
      >
        <div className="relative flex aspect-video w-full items-center justify-center bg-(--pl-video) [:fullscreen_&]:aspect-auto [:fullscreen_&]:min-h-0 [:fullscreen_&]:flex-1">
          <video
            ref={video}
            src={source}
            autoPlay={source !== undefined}
            poster={d.thumbnailHref}
            preload="none"
            playsInline
            onLoadedMetadata={(event) => {
              // A new request is a new element state: the rate and the mute do
              // not survive it, and a pill that still reads 1.5 over a picture
              // running at 1.0 is the player lying about itself.
              event.currentTarget.playbackRate = Number(speed)
              event.currentTarget.volume = volume
              event.currentTarget.muted = muted
            }}
            onLoadedData={() =>
              setPhase((was) => (was === 'waiting' ? 'paused' : was))
            }
            onPlaying={() => setPhase('playing')}
            onWaiting={() => setPhase('waiting')}
            onPause={() =>
              setPhase((was) => (was === 'waiting' ? was : 'paused'))
            }
            onEnded={() => setPhase('paused')}
            onError={stumbled}
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
          {(phase === 'waiting' || phase === 'diagnosing') && (
            // Over the middle, on a plate of its own. Japanese recordings carry
            // their subtitles burnt into the bottom of the picture, so a line
            // laid there in thin grey is read off the programme rather than off
            // the player.
            <p
              role="status"
              className="pointer-events-none absolute inset-0 m-auto flex h-fit w-fit max-w-[88%] items-center justify-center gap-2 rounded-full border border-white/25 bg-black/80 px-4 py-2 text-center text-ui font-medium text-(--pl-ink)"
            >
              <Spinner className="text-(--pl-accent)" />
              {WAITING_ON[phase]}
            </p>
          )}
        </div>
        <div className="px-6 pt-2 pb-4 max-[700px]:px-4 [:fullscreen_&]:max-h-[45vh] [:fullscreen_&]:shrink-0 [:fullscreen_&]:overflow-y-auto">
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
          {/* The row wraps, and a 44px press area on a 27px control reaches
            8.5px past it top and bottom. The lines are held far enough apart
            that no area reaches into the line above or below it, and the row
            starts clear of the bar's own area — 13px below an 18px bar. */}
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-5">
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
              disabled
              aria-pressed={false}
              title={NOT_WIRED}
              className={PTOG}
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
                onChange={() => {}}
                off
                title={NOT_WIRED}
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
            <PlayerVolume level={muted ? 0 : volume} onChoose={chooseVolume} />
            <button
              type="button"
              aria-label="消音"
              aria-pressed={muted}
              onClick={() => mute(!muted)}
              className={cn(CBTN, muted && CBTN_ON)}
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
              aria-pressed={full}
              onClick={toggleFullscreen}
              className={cn(CBTN, full && CBTN_ON)}
            >
              <svg
                viewBox="0 0 24 24"
                className="fill-none stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]"
              >
                {full ? (
                  <path d="M9.4 4.3v5.1H4.3M14.6 4.3v5.1h5.1M9.4 19.7v-5.1H4.3M14.6 19.7v-5.1h5.1" />
                ) : (
                  <path d="M4.3 9.4V4.3h5.1M19.7 9.4V4.3h-5.1M4.3 14.6v5.1h5.1M19.7 14.6v5.1h-5.1" />
                )}
              </svg>
            </button>
          </div>
          <p className="mt-2.5 text-[11px] leading-relaxed text-(--pl-ink-3)">
            字幕と音声の選択はこれから実装されます。画面に見えている字幕は映像に焼き付いたものです。
          </p>
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
                options={PLAYBACK_PROFILES}
                value={profile}
                onChange={chooseProfile}
                numeric
              />
              <span className="text-[11px] text-(--pl-ink-3)">
                オンザフライ再生のときだけ選べます
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
