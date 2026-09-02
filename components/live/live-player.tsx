'use client'

import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import type { LiveStartup, LiveStartupSegment } from '@/lib/live-wire'
import type { LiveChannel, LiveProfile } from '@/repository/live'
import { LIVE_PROFILE_UNASKED, liveWireHref } from '@/repository/live-paths'
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
import { LiveFeed } from '@/components/live/live-feed'
import {
  askWhetherSignedOut,
  openLiveSession,
  type OpenSocket,
} from '@/components/live/live-session'
import { LiveFaultNotice, type LiveFault } from '@/components/live/live-notice'
import { LiveSettings, NOT_WIRED } from '@/components/live/live-settings'
import { LiveStartupSteps } from '@/components/live/live-startup'

/** How long the bar stays after the pointer last said anything, while playing. */
const RESTS = 3000

/** How far behind the newest picture the playhead is kept. */
const TARGET_SECONDS = 1.0

/** Behind by this much, the picture runs a little fast until it is back. */
const CATCH_UP_FROM_SECONDS = 2.5

const CATCH_UP_RATE = 1.05

/** Behind by this much, the playhead is moved to the edge instead. */
const SEEK_FROM_SECONDS = 8

const TICK_MS = 250

type Phase = 'starting' | 'buffering' | 'playing' | 'paused' | 'faulted'

/**
 * One session, as the screen sees it. Keyed by the channel, the profile and
 * the attempt, so that what one wire said is never read as the next one's:
 * a key the render does not recognise is a session that has just begun.
 */
interface Running {
  key: string
  phase: Phase
  fault: LiveFault | null
  startup: LiveStartup
  /** Since the wire was opened, on the browser's own clock. */
  elapsedMs: number
  /** How far behind the newest picture the playhead is, once it is playing. */
  latency?: number
  catchingUp: boolean
}

function begun(key: string): Running {
  return {
    key,
    phase: 'starting',
    fault: null,
    startup: {},
    elapsedMs: 0,
    catchingUp: false,
  }
}

/** What the delay reads as, by how far behind the edge the playhead is. */
function latencyTone(seconds: number): 'ok' | 'warn' | 'err' {
  if (seconds >= SEEK_FROM_SECONDS) {
    return 'err'
  }

  return seconds >= CATCH_UP_FROM_SECONDS ? 'warn' : 'ok'
}

const LATENCY_TONE = {
  ok: 'border-[rgba(134,210,172,.45)] bg-[rgba(134,210,172,.12)] text-[#9FDCBB]',
  warn: 'border-[rgba(229,186,108,.5)] bg-[rgba(229,186,108,.14)] text-[#E5BA6C]',
  err: 'border-[rgba(236,154,147,.5)] bg-[rgba(236,154,147,.14)] text-[#EC9A93]',
} as const

/**
 * The channel, watched.
 *
 * The picture arrives on a socket as fMP4 and is handed to the element through
 * a `MediaSource`; nothing is asked for until a channel is chosen, and choosing
 * another — or another profile — is a new socket, with the old one told that
 * the viewer is leaving so the server frees the seat at once. The chrome is the
 * recording player's: over the picture, down while it plays, back for the
 * pointer or the keyboard.
 *
 * The playhead is held about a second behind the newest picture. Fallen further
 * behind, it runs slightly fast to catch up; fallen far behind, it is moved to
 * the edge. How far behind it is, the bar reads out.
 */
export function LivePlayer({
  channel,
  profiles,
  returnPath,
  openSocket,
  askSignedOut = askWhetherSignedOut,
  wireHref = liveWireHref,
}: {
  /** The channel chosen. Nothing chosen is a face with no picture on it. */
  channel?: LiveChannel
  profiles: LiveProfile[]
  /** Where a sign-in comes back to. */
  returnPath: string
  /** How the wire is opened. The screen opens a `WebSocket`; a story hands in its own. */
  openSocket?: OpenSocket
  /** How a wire that dropped is asked whether the session went with it. */
  askSignedOut?: () => Promise<boolean>
  wireHref?: (networkId: number, serviceId: number, profile: string) => string
}) {
  const video = useRef<HTMLVideoElement>(null)
  const [shell, setShell] = useState<HTMLElement | null>(null)
  const [profile, setProfile] = useState(() =>
    profiles.some((one) => one.name === LIVE_PROFILE_UNASKED)
      ? LIVE_PROFILE_UNASKED
      : (profiles[0]?.name ?? LIVE_PROFILE_UNASKED),
  )
  const [attempt, setAttempt] = useState(0)
  const [held, setHeld] = useState<Running | null>(null)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [full, setFull] = useState(false)

  const [stirred, setStirred] = useState(false)
  const [onTheBar, setOnTheBar] = useState(false)
  const [focused, setFocused] = useState(false)
  const settling = useRef<ReturnType<typeof setTimeout> | null>(null)

  const networkId = channel?.networkId
  const serviceId = channel?.serviceId
  const key =
    networkId === undefined || serviceId === undefined
      ? null
      : `${networkId}:${serviceId}:${profile}:${attempt}`

  /**
   * The session on screen, derived rather than reset: a key the held state
   * does not carry is a session that has just begun, whatever the last one
   * was doing when it was left.
   */
  const running: Running | null =
    key === null ? null : held && held.key === key ? held : begun(key)
  const phase = running?.phase
  const fault = running?.fault ?? null

  // useEffect exception: browser API (the document's fullscreen element) +
  // listener cleanup, the same as the recording player.
  useEffect(() => {
    const read = () => setFull(document.fullscreenElement === shell)

    document.addEventListener('fullscreenchange', read)

    return () => document.removeEventListener('fullscreenchange', read)
  }, [shell])

  // useEffect exception: clearing a timer on unmount.
  useEffect(
    () => () => {
      if (settling.current) {
        clearTimeout(settling.current)
      }
    },
    [],
  )

  // useEffect exception: a socket and a MediaSource are browser resources
  // with a lifetime, and this is where they are opened and closed. One session
  // per channel, profile and attempt: any of the three changing leaves the
  // wire it had and opens the next. Nothing is set here directly — every
  // change of state below is the wire, the element or the clock speaking.
  useEffect(() => {
    const element = video.current

    if (
      key === null ||
      networkId === undefined ||
      serviceId === undefined ||
      !element
    ) {
      return
    }

    const change = (patch: (was: Running) => Running) =>
      setHeld((was) => patch(was && was.key === key ? was : begun(key)))

    const fail = (why: LiveFault) => {
      change((was) => ({ ...was, phase: 'faulted', fault: why }))
      element.pause()
    }

    if (!LiveFeed.supported()) {
      const saying = setTimeout(() => fail({ kind: 'unsupported' }), 0)

      return () => clearTimeout(saying)
    }

    let pictured = false
    let everPlayed = false
    const openedAt = performance.now()

    const mark = (segment: LiveStartupSegment) => {
      const at = Math.round(performance.now() - openedAt)

      change((was) =>
        was.startup[segment] === undefined
          ? { ...was, startup: { ...was.startup, [segment]: at } }
          : was,
      )
    }

    const feed = new LiveFeed(element, () => {
      session.leave()
      fail({ kind: 'unsupported' })
    })

    const session = openLiveSession(
      wireHref(networkId, serviceId, profile),
      {
        onHeader: (init) => {
          feed.header(init)
          mark('initReached')
        },
        onPicture: (bytes) => {
          feed.append(bytes)

          if (!pictured) {
            pictured = true
            mark('firstPicture')
            change((was) =>
              was.phase === 'starting' ? { ...was, phase: 'buffering' } : was,
            )
          }
        },
        // The wire's own times outrank the ones read off the browser's clock.
        onProgress: (reported) =>
          change((was) => ({
            ...was,
            startup: { ...was.startup, ...reported },
          })),
        onRefusal: (refusal, ceiling) =>
          fail({ kind: 'refused', refusal, ceiling }),
        onEnding: (why) => fail({ kind: 'ended', why }),
        onDropped: () => {
          void askSignedOut().then((signedOut) =>
            fail(signedOut ? { kind: 'signedOut' } : { kind: 'dropped' }),
          )
        },
      },
      openSocket,
    )

    const ticking = setInterval(() => {
      const elapsedMs = performance.now() - openedAt

      change((was) => (was.phase === 'starting' ? { ...was, elapsedMs } : was))

      const end = feed.end()
      const start = feed.start()

      if (end === undefined || start === undefined) {
        return
      }

      if (!everPlayed) {
        if (end - start >= TARGET_SECONDS) {
          everPlayed = true
          element.currentTime = Math.max(start, end - TARGET_SECONDS)
          void element
            .play()
            .catch(() => change((was) => ({ ...was, phase: 'paused' })))
        }

        return
      }

      const behind = Math.max(0, end - element.currentTime)

      if (!element.paused) {
        if (behind >= SEEK_FROM_SECONDS) {
          element.currentTime = Math.max(start, end - TARGET_SECONDS)
          element.playbackRate = 1
        } else if (behind >= CATCH_UP_FROM_SECONDS) {
          element.playbackRate = CATCH_UP_RATE
        } else if (behind <= TARGET_SECONDS + 0.25) {
          element.playbackRate = 1
        }
      }

      const catchingUp = element.playbackRate > 1

      change((was) =>
        was.latency === behind && was.catchingUp === catchingUp
          ? was
          : { ...was, latency: behind, catchingUp },
      )
    }, TICK_MS)

    return () => {
      clearInterval(ticking)
      session.leave()
      feed.close()
    }
  }, [key, networkId, serviceId, profile, openSocket, askSignedOut, wireHref])

  /** The element said something about this session. */
  const heard = (patch: (was: Running) => Running) => {
    if (key === null) {
      return
    }

    setHeld((was) => patch(was && was.key === key ? was : begun(key)))
  }

  const hasPicture =
    phase === 'playing' || phase === 'paused' || phase === 'buffering'
  const chromeUp = phase !== 'playing' || stirred || onTheBar || focused

  const stir = () => {
    if (settling.current) {
      clearTimeout(settling.current)
    }

    setStirred(true)
    settling.current = setTimeout(() => setStirred(false), RESTS)
  }

  const toggle = () => {
    const element = video.current

    if (!element || !hasPicture) {
      return
    }

    if (element.paused) {
      void element
        .play()
        .catch(() => heard((was) => ({ ...was, phase: 'paused' })))

      return
    }

    element.pause()
  }

  const chooseVolume = (next: number) => {
    const element = video.current

    setVolume(next)
    setMuted(next === 0)

    if (element) {
      element.volume = next
      element.muted = next === 0
    }
  }

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

  const latency = running?.latency

  return (
    <section
      ref={setShell}
      data-slot="live-player"
      data-phase={phase ?? 'idle'}
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
          playsInline
          onPlaying={() => {
            heard((was) => ({ ...was, phase: 'playing' }))
            stir()
          }}
          onPause={() =>
            heard((was) =>
              was.phase === 'playing' ? { ...was, phase: 'paused' } : was,
            )
          }
          onWaiting={() =>
            heard((was) =>
              was.phase === 'playing' ? { ...was, phase: 'buffering' } : was,
            )
          }
          className={cn(
            PLAYER_PICTURE,
            '[:fullscreen_&]:max-w-none',
            !hasPicture && 'invisible',
          )}
        />
        {channel && running && phase !== 'faulted' && (
          <span className="absolute top-3 left-3 rounded-full bg-black/45 px-3 py-1 text-[11.5px] text-(--pl-ink)">
            <b className="font-bold">
              {channel.no && (
                <span className="mr-1.5 font-code font-medium">
                  {channel.no}
                </span>
              )}
              {channel.name}
            </b>{' '}
            {phase === 'starting' ? '準備中' : '生放送'}
          </span>
        )}
        {running && phase === 'starting' && (
          <LiveStartupSteps
            startup={running.startup}
            elapsedMs={running.elapsedMs}
          />
        )}
        {phase === 'buffering' && (
          <p
            role="status"
            className="pointer-events-none absolute inset-0 m-auto flex h-fit w-fit max-w-[88%] items-center justify-center gap-2 rounded-full border border-white/25 bg-black/80 px-4 py-2 text-center text-ui font-medium text-(--pl-ink)"
          >
            <Spinner className="text-(--pl-accent)" />
            バッファリング中
          </p>
        )}
        {phase === 'faulted' && fault && (
          <LiveFaultNotice
            fault={fault}
            onRetry={() => setAttempt((was) => was + 1)}
            returnPath={returnPath}
            className="absolute inset-0 flex flex-col items-center justify-center"
          />
        )}
        <div
          data-slot="player-chrome"
          hidden={key === null}
          data-up={chromeUp ? 'true' : undefined}
          onPointerEnter={() => setOnTheBar(true)}
          onPointerLeave={() => setOnTheBar(false)}
          onFocus={(event) =>
            setFocused(
              event.target instanceof Element &&
                event.target.matches(':focus-visible'),
            )
          }
          onBlur={() => setFocused(false)}
          className={cn(
            'absolute inset-x-0 bottom-0 z-10 bg-(--pl-chrome) px-4 py-3 max-[700px]:px-3',
            'pointer-events-none opacity-0 transition-opacity duration-200',
            'data-[up]:pointer-events-auto data-[up]:opacity-100',
            'has-[:focus-visible]:pointer-events-auto has-[:focus-visible]:opacity-100',
          )}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-4">
            <button
              type="button"
              aria-label={phase === 'playing' ? '一時停止' : '再生'}
              disabled={!hasPicture}
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
            {latency !== undefined && (
              <span
                data-slot="live-latency"
                data-tone={latencyTone(latency)}
                className={cn(
                  'inline-flex items-center gap-[7px] rounded-full border px-3 py-[3px] text-[11.5px] font-medium whitespace-nowrap',
                  LATENCY_TONE[latencyTone(latency)],
                )}
              >
                <i
                  aria-hidden="true"
                  className="size-[7px] shrink-0 rounded-full bg-current"
                />
                遅延 <span className="font-code">{latency.toFixed(1)}</span> 秒
                {running?.catchingUp && (
                  <span className="text-(--pl-ink-2)">
                    / 再生レート{' '}
                    <span className="font-code">
                      {CATCH_UP_RATE.toFixed(2)}
                    </span>
                  </span>
                )}
              </span>
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
              <LiveSettings
                container={shell}
                profiles={profiles}
                profile={profile}
                onChooseProfile={setProfile}
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
  )
}
