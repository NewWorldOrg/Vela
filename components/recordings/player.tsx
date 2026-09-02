'use client'

import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { formatPlayhead } from '@/lib/format'
import type { RecordingDetail } from '@/repository/recordings'
import type { PlaybackPlan, TicketWrite } from '@/repository/videos'
import {
  PLAYBACK_PROFILE_UNASKED,
  videoPictureHref,
  videoFrameHref,
  type PlaybackProfile,
} from '@/repository/video-paths'
import { PlayIcon } from '@/components/vela/icons'
import { Spinner } from '@/components/vela/progress'
import {
  PLAYER_BUTTON,
  PLAYER_FACE,
  PLAYER_PALETTE,
  PLAYER_PICTURE,
  PLAYER_ROUND_BUTTON,
  PLAYER_ROUND_BUTTON_ON,
} from '@/components/recordings/player-palette'
import { PlayerVolume } from '@/components/recordings/player-volume'
import { PlayerSeek } from '@/components/recordings/player-seek'
import { PlayerSettings } from '@/components/recordings/player-settings'
import { PlayerReading } from '@/components/recordings/player-reading'
import {
  askWhyItWouldNotPlay,
  faultOnTheFace,
  PlaybackFaultNotice,
  type PlaybackFault,
} from '@/components/recordings/playback-fault'
import { pressable, still } from '@/components/vela/tactile'

/**
 * What has no argument on the API yet. The control stays on the bar, drawn
 * switched off: taken away it would be missed, and left pressable it would
 * move its own pill over a picture that never changed. Why is in the gear,
 * beside the two tracks it is the same answer for.
 */
const NOT_WIRED = '字幕と音声の選択はこれから実装されます'

/** What the chapter marks cannot be jumped along yet. */
const NOT_YET = '再生はこれから実装されます'

/**
 * How long the bar stays after the pointer last said anything, while the
 * picture is running.
 *
 * Three seconds is long enough to cross the bar and reach a control, and short
 * enough that a picture watched to the end is not watched through a strip of
 * chrome. Nothing counts down while the picture is not running: a paused
 * player has nothing to get out of the way of.
 */
const RESTS = 3000

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
 * The picture takes the whole of the player and the controls are laid over it,
 * the way every player anyone has used is built. They were stacked under the
 * picture before — seven strips of switches, keys and prose — and the picture
 * was the smallest thing on a screen about watching a recording.
 *
 * The bar is up whenever the picture is not running, and while it is running
 * it is up for as long as the pointer is saying something, or the keyboard is
 * inside it. Hidden, it is still in the tab order and comes back the moment
 * focus reaches it: a control that cannot be reached without a pointer is a
 * control half the readers do not have.
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
  const video = useRef<HTMLVideoElement>(null)
  /**
   * The pane the picture is drawn in, held as state and not as a ref: it is
   * what goes fullscreen, and it is also where the settings surface has to be
   * put while it is — and a portal is given its container while rendering, so
   * a ref that is still null on the first pass would send the surface to a
   * body that is not being drawn.
   */
  const [shell, setShell] = useState<HTMLElement | null>(null)
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

  /** Whether the pointer has said anything in the last few seconds. */
  const [stirred, setStirred] = useState(false)
  /** Whether the pointer is resting on the bar itself. */
  const [onTheBar, setOnTheBar] = useState(false)
  /**
   * Whether the keyboard — and not a click — is somewhere inside the bar.
   *
   * `:focus-visible` and not `:focus`, because pressing play with a mouse
   * leaves that button focused: read as focus, the bar would never go down
   * again after the one press every reader makes first.
   */
  const [held, setHeld] = useState(false)
  const settling = useRef<ReturnType<typeof setTimeout> | null>(null)

  /**
   * Which attempt an answer belongs to. A reason is asked for over the network
   * and arrives after the press that started it, so an answer about a picture
   * nobody is waiting for any more is dropped rather than drawn.
   */
  const attempt = useRef(0)

  const duration = d.lengthSec ?? 0
  const drops = d.qualitySpots?.map((spot) => spot.second)
  const chromeUp = phase !== 'playing' || stirred || onTheBar || held

  // useEffect exception: browser API (the document's fullscreen element) +
  // listener cleanup. Leaving fullscreen by Esc is not a press this component
  // sees, and the control that says "leave" is inside the picture now.
  useEffect(() => {
    const read = () => setFull(document.fullscreenElement === shell)

    document.addEventListener('fullscreenchange', read)

    return () => document.removeEventListener('fullscreenchange', read)
  }, [shell])

  // useEffect exception: clearing a timer on unmount. Nothing is read or
  // synced here; the timer is started by a pointer and would otherwise fire
  // into a component that has gone.
  useEffect(
    () => () => {
      if (settling.current) {
        clearTimeout(settling.current)
      }
    },
    [],
  )

  /** The pointer said something: put the bar up and start the count again. */
  const stir = () => {
    if (settling.current) {
      clearTimeout(settling.current)
    }

    setStirred(true)
    settling.current = setTimeout(() => setStirred(false), RESTS)
  }

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

  const chooseSpeed = (next: string) => {
    setSpeed(next)

    if (video.current) {
      video.current.playbackRate = Number(next)
    }
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

    void shell?.requestFullscreen?.()
  }

  if (phase === 'broken') {
    return (
      <div className="mx-[30px] max-[1060px]:mx-5 max-[700px]:mx-3.5">
        <PlaybackFaultNotice
          detail={d}
          fault={fault}
          onRetry={() => play(position)}
          onTakeTicket={onTakeTicket}
        />
      </div>
    )
  }

  return (
    <div className="mx-[30px] max-[1060px]:mx-5 max-[700px]:mx-3.5">
      <section
        ref={setShell}
        style={PLAYER_PALETTE}
        onPointerMove={stir}
        onPointerLeave={stir}
        onKeyDown={stir}
        className={cn(
          'relative w-full overflow-hidden rounded-xl border border-line-strong bg-(--pl-video) shadow-pop-xl',
          '[&:fullscreen]:flex [&:fullscreen]:flex-col [&:fullscreen]:rounded-none [&:fullscreen]:border-0 [&:fullscreen]:shadow-none',
        )}
      >
        <div
          className={cn(
            'relative flex items-center justify-center',
            PLAYER_FACE,
            '[:fullscreen_&]:aspect-auto [:fullscreen_&]:max-h-none [:fullscreen_&]:min-h-0 [:fullscreen_&]:flex-1',
          )}
        >
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
            onPlaying={() => {
              setPhase('playing')
              stir()
            }}
            onWaiting={() => setPhase('waiting')}
            onPause={() =>
              setPhase((was) => (was === 'waiting' ? was : 'paused'))
            }
            onEnded={() => setPhase('paused')}
            onError={stumbled}
            onTimeUpdate={(event) =>
              setPosition(from + event.currentTarget.currentTime)
            }
            className={cn(PLAYER_PICTURE, '[:fullscreen_&]:max-w-none')}
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
          {/*
            Down is said with `opacity` and the pointer events, not with
            `visibility` or by taking it out of the page: a bar that is not
            laid out cannot be tabbed to, and a control the keyboard cannot
            reach is a control that is not there. The keyboard is what brings
            it back — `:focus-visible`, so that the click that started the
            picture does not leave the bar standing over it for the rest of the
            programme — and the CSS says so as well as the handler, so the rule
            holds on the first tab in.
          */}
          <div
            data-slot="player-chrome"
            data-up={chromeUp ? 'true' : undefined}
            onPointerEnter={() => setOnTheBar(true)}
            onPointerLeave={() => setOnTheBar(false)}
            onFocus={(event) =>
              setHeld(
                event.target instanceof Element &&
                  event.target.matches(':focus-visible'),
              )
            }
            onBlur={() => setHeld(false)}
            className={cn(
              'absolute inset-x-0 bottom-0 z-10 bg-(--pl-chrome) px-4 pt-3.5 pb-3 max-[700px]:px-3',
              'pointer-events-none opacity-0 transition-opacity duration-200',
              'data-[up]:pointer-events-auto data-[up]:opacity-100',
              'has-[:focus-visible]:pointer-events-auto has-[:focus-visible]:opacity-100',
            )}
          >
            {duration > 0 && (
              <PlayerSeek
                id={d.id}
                duration={duration}
                position={position}
                drops={drops}
                marks={d.seek}
                onChoose={choose}
                frameHref={frameHref}
              />
            )}
            {/* The seek bar is 18px tall and its 44px area reaches 13px past
              it; the round buttons are 32px and theirs reaches 6px. 24px
              between the two rows leaves 5px of clear air, so neither answers
              a press meant for the other. */}
            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-4">
              <button
                type="button"
                aria-label={phase === 'playing' ? '一時停止' : '再生'}
                onClick={toggle}
                className={PLAYER_ROUND_BUTTON}
              >
                {phase === 'playing' ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4 fill-none stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]"
                  >
                    <path d="M9.4 5.8v12.4M14.6 5.8v12.4" />
                  </svg>
                ) : (
                  <PlayIcon className="size-4" />
                )}
              </button>
              <span className="font-code text-sub whitespace-nowrap text-(--pl-ink-2)">
                {formatPlayhead(position)} / {formatPlayhead(duration)}
              </span>
              {/*
                Beside the transport and not in the gear: moving along the
                recording is what a player is pressed for, and the marks it
                jumps between are on the bar above it. The rule it comes from
                is that a chapter is jumped by a press and never skipped on
                the reader's behalf, so there has to be a press.
              */}
              {d.seek?.chapterPcts && (
                <button
                  type="button"
                  disabled
                  title={NOT_YET}
                  className={PLAYER_BUTTON}
                >
                  次のチャプターへ
                  <span className="ml-1.5 inline-block rounded border border-white/20 px-1 font-code text-[11px] leading-normal text-(--pl-ink-3)">
                    →
                  </span>
                </button>
              )}
              <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-4 max-[700px]:ml-0">
                <button
                  type="button"
                  disabled
                  aria-pressed={false}
                  title={NOT_WIRED}
                  className={PLAYER_BUTTON}
                >
                  字幕
                </button>
                <PlayerVolume
                  level={muted ? 0 : volume}
                  onChoose={chooseVolume}
                />
                <button
                  type="button"
                  aria-label="消音"
                  aria-pressed={muted}
                  onClick={() => mute(!muted)}
                  className={cn(
                    PLAYER_ROUND_BUTTON,
                    muted && PLAYER_ROUND_BUTTON_ON,
                  )}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4 fill-none stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]"
                  >
                    <path d="M11.2 5.2 6.7 9.1H3.2v5.9h3.5l4.5 3.9V5.2Z" />
                    {muted ? (
                      <path d="M15.2 9.4 19.6 14.6M19.6 9.4 15.2 14.6" />
                    ) : (
                      <path d="M15 9.3a3.7 3.7 0 0 1 .1 5.5" />
                    )}
                  </svg>
                </button>
                <PlayerSettings
                  container={shell}
                  profile={profile}
                  onChooseProfile={chooseProfile}
                  onTheFly={onTheFly}
                  speed={speed}
                  onChooseSpeed={chooseSpeed}
                />
                <button
                  type="button"
                  aria-label="全画面"
                  aria-pressed={full}
                  onClick={toggleFullscreen}
                  className={cn(
                    PLAYER_ROUND_BUTTON,
                    full && PLAYER_ROUND_BUTTON_ON,
                  )}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4 fill-none stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]"
                  >
                    {full ? (
                      <path d="M9.4 4.3v5.1H4.3M14.6 4.3v5.1h5.1M9.4 19.7v-5.1H4.3M14.6 19.7v-5.1h5.1" />
                    ) : (
                      <path d="M4.3 9.4V4.3h5.1M19.7 9.4V4.3h-5.1M4.3 14.6v5.1h5.1M19.7 14.6v5.1h-5.1" />
                    )}
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
      <PlayerReading
        detail={d}
        plan={plan}
        onTakeTicket={onTakeTicket}
        video={video}
      />
    </div>
  )
}
