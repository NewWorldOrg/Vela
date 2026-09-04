'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

import { cn } from '@/lib/utils'
import type { LiveStartup, LiveStartupSegment } from '@/lib/live-wire'
import type { LiveChannel, LiveProfile } from '@/repository/live'
import { LIVE_PROFILE_UNASKED, liveWireHref } from '@/repository/live-paths'
import { playerCommand, VOLUME_STEP_PERCENT } from '@/lib/player-keys'
import {
  CATCH_UP_RATE,
  holdOf,
  reachOf,
  SEEK_FROM_SECONDS,
  targetOf,
  windowOf,
} from '@/lib/live-latency'
import {
  CaptionsGlyph,
  FullscreenIcon,
  PauseGlyph,
  PlayGlyph,
  VolumeIcon,
} from '@/components/vela/icons'
import { Spinner } from '@/components/vela/progress'
import {
  PLAYER_BOARD,
  PLAYER_BUTTON,
  PLAYER_BUTTON_ON,
  PLAYER_CHROME_FADE,
  PLAYER_FACE,
  PLAYER_GLYPH_BUTTON,
  PLAYER_GLYPH_BUTTON_ON,
  PLAYER_PALETTE,
  PLAYER_PICTURE_BOX,
  PLAYER_SCRIM,
  PLAYER_SCRIM_TOP,
} from '@/components/recordings/player-palette'
import { PlayerVolume } from '@/components/recordings/player-volume'
import {
  PlayerCenter,
  type PlayerBezel,
} from '@/components/recordings/player-center'

import { CaptionLayer } from '@/components/live/live-captions'
import { LiveFeed } from '@/components/live/live-feed'
import {
  askWhetherSignedOut,
  openLiveSession,
  type OpenSocket,
} from '@/components/live/live-session'
import { LiveFaultNotice, type LiveFault } from '@/components/live/live-notice'
import { LiveSettings } from '@/components/live/live-settings'
import { LiveStartupSteps } from '@/components/live/live-startup'

/** How long the bar stays after the pointer last said anything, while playing. */
const RESTS = 3000

const TICK_MS = 250

/**
 * How long the startup is given before the screen stops waiting for it.
 *
 * A wire that is refused says so and a wire that drops closes, and both put
 * something on the screen the reader can act on. A wire that does neither —
 * open, silent, and carrying no picture — leaves the startup plate spinning
 * with nothing that will ever take it off, and a reader watching that has no
 * way to tell it from a channel that is merely slow.
 *
 * The bound is set well past a slow one rather than near a quick one: the
 * design's own worked example has a transcoder still starting at 18.7 seconds
 * against a median of 22.3, so a startup of half a minute is ordinary and only
 * one much longer than that is stuck.
 */
const STARTUP_DEADLINE_MS = 45000

type Phase = 'starting' | 'buffering' | 'playing' | 'paused' | 'faulted'

/**
 * The retries pressed on one channel in one profile, and what the last wire
 * had come to when the press was made. Held against the channel so that a
 * press on one is not carried to the next: a channel chosen afresh begins at
 * its first attempt, however many the last one took.
 */
interface Retries {
  of: string
  count: number
  after: LiveFault['kind']
}

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

  return seconds > windowOf(0).start ? 'warn' : 'ok'
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
 *
 * The captions come on the same wire as pictures the server drew, and are laid
 * over the element on a canvas of their own as the playhead reaches each one's
 * stamp. The switch on the bar stops the drawing, not the receiving, so what is
 * showing now comes back the moment it is switched on again.
 */
export function LivePlayer({
  channel,
  profiles,
  returnPath,
  openSocket,
  askSignedOut = askWhetherSignedOut,
  wireHref = liveWireHref,
  startupDeadlineMs = STARTUP_DEADLINE_MS,
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
  /** How long a silent startup is waited out. A story sets its own and waits. */
  startupDeadlineMs?: number
}) {
  const video = useRef<HTMLVideoElement>(null)
  const overlay = useRef<HTMLCanvasElement>(null)
  const captions = useRef<CaptionLayer | null>(null)
  const captionsWanted = useRef(true)
  const [captioned, setCaptioned] = useState(true)
  const [shell, setShell] = useState<HTMLElement | null>(null)
  const [profile, setProfile] = useState(() =>
    profiles.some((one) => one.name === LIVE_PROFILE_UNASKED)
      ? LIVE_PROFILE_UNASKED
      : (profiles[0]?.name ?? LIVE_PROFILE_UNASKED),
  )
  const [retries, setRetries] = useState<Retries | null>(null)
  const [held, setHeld] = useState<Running | null>(null)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [full, setFull] = useState(false)

  const [stirred, setStirred] = useState(false)
  const [onTheBar, setOnTheBar] = useState(false)
  const [focused, setFocused] = useState(false)
  /**
   * The mark that answers a press in the middle of the picture, and which
   * press it answers. The recording player's, unchanged: a live picture is
   * still a picture that stops when it is told to.
   */
  const [bezel, setBezel] = useState<(PlayerBezel & { nth: number }) | null>(
    null,
  )
  /** Whether the settings surface is open, which holds the bar up. */
  const [settingsOpen, setSettingsOpen] = useState(false)
  /** Whether that surface was open when the press began — see the recording player. */
  const dismissing = useRef(false)
  const settling = useRef<ReturnType<typeof setTimeout> | null>(null)
  /**
   * The times this session's picture has run out of ground to play. It is what
   * moves the figure the playhead is held at: a target is a claim about what
   * this wire and this machine can hold, and a stall is that claim being
   * wrong. Held against the session, so a wire that opens afresh begins by
   * believing the figure again.
   */
  const stalls = useRef(0)

  const networkId = channel?.networkId
  const serviceId = channel?.serviceId
  const seat =
    networkId === undefined || serviceId === undefined
      ? null
      : `${networkId}:${serviceId}:${profile}`
  const retried = retries && retries.of === seat ? retries : null
  const attempt = retried?.count ?? 0
  const key = seat === null ? null : `${seat}:${attempt}`

  /**
   * A retry after a wire that was open and then lost — dropped, or ended by
   * the server — is a reconnection, and the startup says so; one after a
   * refusal is a fresh tune, because no wire ever carried anything.
   */
  const reconnecting =
    retried && (retried.after === 'dropped' || retried.after === 'ended')
      ? retried.count
      : undefined

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

    /**
     * The session is over, and this is why. Said once: the first answer is the
     * true one, and the clock below must not talk over it — a wire refused at
     * once is a wire that never carried a picture, and left on the screen it
     * would otherwise reach the startup deadline and have its reason replaced
     * by one that reads as a slow start.
     */
    let settled = false

    // The element outlives the wire, and the rate is the element's. A session
    // that opened while the last one was still catching up would otherwise
    // begin quickened, on ground it has not lost.
    element.playbackRate = 1
    stalls.current = 0

    const fail = (why: LiveFault) => {
      if (settled) {
        return
      }

      settled = true
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

    const layer = overlay.current
      ? new CaptionLayer(overlay.current, element)
      : null

    layer?.show(captionsWanted.current)
    captions.current = layer

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
        onCaptionCanvas: (canvas) => layer?.canvasOf(canvas),
        onCaption: (picture, pts) => layer?.offer(picture, pts),
        // The wire's own times outrank the ones read off the browser's clock.
        onProgress: (reported) =>
          change((was) => ({
            ...was,
            startup: { ...was.startup, ...reported },
          })),
        onRefusal: (refusal, over) =>
          fail({ kind: 'refused', refusal, ...over }),
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
      if (settled) {
        clearInterval(ticking)

        return
      }

      const elapsedMs = performance.now() - openedAt

      // Nothing has come and nothing is going to. The seat is given up here
      // rather than held until the socket is closed for us: a tuner kept by a
      // session that will never show a picture is one no other viewer, and no
      // recording, can have.
      if (!pictured && elapsedMs >= startupDeadlineMs) {
        clearInterval(ticking)
        session.leave()
        fail({ kind: 'tookTooLong' })

        return
      }

      change((was) => (was.phase === 'starting' ? { ...was, elapsedMs } : was))

      const runs = feed.runs()
      const end = feed.end()
      const start = feed.start()

      if (end === undefined || start === undefined) {
        return
      }

      if (!everPlayed) {
        if (end - start >= targetOf(0)) {
          everPlayed = true
          element.currentTime = Math.max(start, end - targetOf(0))
          void element
            .play()
            .catch(() => change((was) => ({ ...was, phase: 'paused' })))
        }

        return
      }

      const behind = Math.max(0, end - element.currentTime)

      if (!element.paused) {
        const hold = holdOf({
          rate: element.playbackRate,
          at: element.currentTime,
          edge: end,
          reach: reachOf(runs, element.currentTime),
          from: start,
          stalls: stalls.current,
        })

        if (hold.seekTo !== undefined) {
          element.currentTime = hold.seekTo
        }

        if (element.playbackRate !== hold.rate) {
          element.playbackRate = hold.rate
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
      layer?.close()
      captions.current = null
    }
  }, [
    key,
    networkId,
    serviceId,
    profile,
    openSocket,
    askSignedOut,
    wireHref,
    startupDeadlineMs,
  ])

  /** The element said something about this session. */
  const heard = (patch: (was: Running) => Running) => {
    if (key === null) {
      return
    }

    setHeld((was) => patch(was && was.key === key ? was : begun(key)))
  }

  const hasPicture =
    phase === 'playing' || phase === 'paused' || phase === 'buffering'
  const chromeUp =
    phase !== 'playing' || stirred || onTheBar || focused || settingsOpen

  /**
   * Whether the reader has aimed at this player, as against the screen having
   * handed it the focus when the picture came up.
   *
   * Only the arrows read it, and on live only the two that move the volume.
   * They are the page's way down a page before they are anyone's, and the
   * channel list sits beside this picture. video.js does not give the arrows
   * to the player at all — its sliders own them — and Shaka passes them only
   * when the seek bar has the focus or the picture is full screen.
   *
   * Pressing the picture is aiming. Tabbing into the bar is aiming. The
   * picture arriving is not.
   *
   * A ref and not state: nothing is drawn from it, and a press in the same
   * tick as the aim would read a value React has not re-rendered yet.
   */
  const aimed = useRef(false)

  const stir = () => {
    if (settling.current) {
      clearTimeout(settling.current)
    }

    setStirred(true)
    settling.current = setTimeout(() => setStirred(false), RESTS)
  }

  /*
    The sound is answered here as it is on a recording. Seeking is not: the
    live picture is one edge and there is nowhere to go, so ← → are not taken
    at all (v3.24) and there is nothing to answer.
  */
  const answer = (what: PlayerBezel) =>
    setBezel((last) => ({ ...what, nth: (last?.nth ?? 0) + 1 }))

  const toggle = () => {
    const element = video.current

    if (!element || !hasPicture) {
      return
    }

    if (element.paused) {
      answer({ was: 'play' })
      void element
        .play()
        .catch(() => heard((was) => ({ ...was, phase: 'paused' })))

      return
    }

    answer({ was: 'pause' })
    element.pause()
  }

  const toggleCaptions = () => {
    const next = !captioned

    captionsWanted.current = next
    setCaptioned(next)
    captions.current?.show(next)
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

  /**
   * The level the bar is showing, read off the element rather than the state,
   * so that a run of presses arriving faster than React draws steps once per
   * press. Silent reads as nought whatever level the mute is holding.
   */
  const showing = () => {
    const element = video.current

    if (!element) {
      return muted ? 0 : volume
    }

    return element.muted ? 0 : element.volume
  }

  /** Louder or quieter by a step. */
  const stepVolume = (by: number) => {
    const next =
      Math.min(100, Math.max(0, Math.round(showing() * 100) + by)) / 100

    chooseVolume(next)
    answer({ was: 'volume', level: next })
  }

  const mute = (quiet: boolean) => {
    const element = video.current
    const level = !quiet && volume === 0 ? 1 : volume

    setMuted(quiet)
    setVolume(level)
    answer({ was: 'volume', level: quiet ? 0 : level })

    if (element) {
      element.volume = level
      element.muted = quiet
    }
  }

  const toggleFullscreen = () => {
    // Refused either way, nothing is drawn from the call: what the bar reads
    // comes from the `fullscreenchange` listener, which says nothing after a
    // refusal because nothing changed.
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined)

      return
    }

    void shell?.requestFullscreen?.().catch(() => undefined)
  }

  /**
   * The keys, the recording player's set less the two that move a position.
   *
   * There is one picture on a live wire and it is the edge: back would leave
   * the few seconds the browser is holding, and forward has nothing to go
   * into. So the arrows are not taken — not disabled, not given a meaning of
   * their own — and the browser keeps whatever it would have done with them.
   * An assignment with no control on the bar to mirror it would be an
   * invention, and the bar has no seek.
   */
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const command = playerCommand(event, {
      seeks: false,
      captions: true,
      aimed: aimed.current,
    })

    if (!command) {
      return
    }

    // Only now: a press the player did not take must not raise the bar, or
    // reading the channel list would flash chrome over the picture.
    stir()
    event.preventDefault()

    switch (command) {
      case 'toggle':
        toggle()
        break
      case 'louder':
        stepVolume(VOLUME_STEP_PERCENT)
        break
      case 'quieter':
        stepVolume(-VOLUME_STEP_PERCENT)
        break
      case 'mute':
        mute(!(video.current?.muted ?? muted))
        break
      case 'fullscreen':
        toggleFullscreen()
        break
      case 'captions':
        toggleCaptions()
        break
      default:
        break
    }
  }

  /*
    useEffect exception: a browser API when the picture arrives. The keys are
    the player's while it has the focus (WCAG 2.1.4), so the player takes the
    focus as soon as there is a picture to press keys at — otherwise the focus
    is left wherever choosing the channel put it and Space does nothing.

    `preventScroll`, so the page does not jump under the hand.
  */
  useEffect(() => {
    if (hasPicture) {
      shell?.focus({ preventScroll: true })
    }
  }, [shell, hasPicture])

  const latency = running?.latency

  return (
    <section
      ref={setShell}
      tabIndex={-1}
      data-slot="live-player"
      data-phase={phase ?? 'idle'}
      style={PLAYER_PALETTE}
      onPointerMove={stir}
      onPointerLeave={stir}
      onPointerDown={() => {
        aimed.current = true
      }}
      onKeyDown={onKeyDown}
      className={PLAYER_BOARD}
    >
      <div
        className={cn(
          'relative flex items-center justify-center',
          PLAYER_FACE,
          '[:fullscreen_&]:aspect-auto [:fullscreen_&]:max-h-none [:fullscreen_&]:min-h-0 [:fullscreen_&]:flex-1',
        )}
      >
        <div
          className={cn(
            'relative',
            PLAYER_PICTURE_BOX,
            '[:fullscreen_&]:max-w-none',
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
            onWaiting={() => {
              if (phase === 'playing') {
                stalls.current += 1
              }

              heard((was) =>
                was.phase === 'playing' ? { ...was, phase: 'buffering' } : was,
              )
            }}
            className={cn(
              'size-full object-contain',
              !hasPicture && 'invisible',
            )}
          />
          <canvas
            ref={overlay}
            aria-hidden="true"
            data-slot="live-captions"
            className="pointer-events-none absolute inset-0 size-full"
          />
        </div>
        {hasPicture && (
          // The same press area the recording player has: one press runs or
          // stops the picture, two put it on the whole screen, and the second
          // press of a double undoes the first. The picture answering a press,
          // not a control — the one that says 再生 is on the bar. Only over a
          // picture: a wire still starting, or one that faulted, has its own
          // plate there, and the one on a fault is pressed.
          <div
            data-slot="player-press"
            onMouseDown={(event) => {
              event.preventDefault()
              dismissing.current = settingsOpen
              shell?.focus({ preventScroll: true })
            }}
            onClick={() => {
              if (dismissing.current) {
                dismissing.current = false

                return
              }

              toggle()
            }}
            onDoubleClick={toggleFullscreen}
            data-up={chromeUp ? 'true' : undefined}
            className="absolute inset-0 cursor-none select-none data-[up]:cursor-pointer"
          />
        )}
        {hasPicture && (
          // The recording player's middle, unchanged. A live picture that has
          // been stopped is as still as any other, and the press that stopped
          // it was made at the bottom edge or on a key.
          <PlayerCenter
            standing={phase === 'paused' ? 'play' : undefined}
            /*
              The button goes as soon as the picture runs, and a focused
              element that unmounts drops the focus back to `<body>` — which
              is where the keys were dead to begin with. So the press hands the
              focus to the player before the button leaves.
            */
            onStanding={() => {
              shell?.focus({ preventScroll: true })
              toggle()
            }}
            bezel={bezel ?? undefined}
          />
        )}
        {channel && running && phase !== 'faulted' && (
          /*
            What is being watched, at the top of the picture, on a wash of its
            own — the place and the treatment YouTube and Netflix both give a
            title over video. It comes and goes with the bar, because it is the
            same statement: a reader who has stopped moving is watching, and a
            reader who moves is looking for the controls and for what this is.
          */
          <div
            data-slot="live-title"
            data-up={chromeUp ? 'true' : undefined}
            style={{ backgroundImage: PLAYER_SCRIM_TOP }}
            className={cn(
              'pointer-events-none absolute inset-x-0 top-0 z-10 px-4 pt-3 pb-10',
              '-translate-y-2 opacity-0',
              PLAYER_CHROME_FADE,
              'data-[up]:translate-y-0 data-[up]:opacity-100',
            )}
          >
            <span className="text-[12px] text-white">
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
          </div>
        )}
        {running && phase === 'starting' && (
          <LiveStartupSteps
            startup={running.startup}
            elapsedMs={running.elapsedMs}
            reconnecting={reconnecting}
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
            onRetry={() =>
              seat &&
              setRetries({ of: seat, count: attempt + 1, after: fault.kind })
            }
            returnPath={returnPath}
            className="absolute inset-0 flex flex-col items-center justify-center"
          />
        )}
        {/*
          A wire that faulted takes the bar with it. Its plate is on the face —
          the reason, and the retry — and that is the whole of what there is to
          do: no picture is coming, so 字幕 has nothing to draw over, the
          volume has nothing to make louder, 設定 has no session to reopen in
          another profile and 全画面 has nothing to fill the screen with. Left
          laid out, as it was, only 再生 came up disabled and the other four
          stayed live and answered a press by doing nothing.

          A wire still starting keeps it. There the picture is on its way, the
          levels set now are the ones it arrives at, and the profile it arrives
          in can still be changed — which is a press that only exists on this
          bar.
        */}
        <div
          data-slot="player-chrome"
          hidden={key === null || phase === 'faulted'}
          data-up={chromeUp ? 'true' : undefined}
          onPointerEnter={() => setOnTheBar(true)}
          onPointerLeave={() => setOnTheBar(false)}
          onFocus={(event) => {
            const reached =
              event.target instanceof Element &&
              event.target.matches(':focus-visible')

            setFocused(reached)

            if (reached) {
              aimed.current = true
            }
          }}
          onBlur={() => setFocused(false)}
          style={{ backgroundImage: PLAYER_SCRIM }}
          className={cn(
            'absolute inset-x-0 bottom-0 z-10 px-4 pt-12 pb-3 max-[700px]:px-3',
            'pointer-events-none translate-y-2 opacity-0',
            PLAYER_CHROME_FADE,
            'data-[up]:pointer-events-auto data-[up]:translate-y-0 data-[up]:opacity-100',
            'has-[:focus-visible]:pointer-events-auto has-[:focus-visible]:translate-y-0 has-[:focus-visible]:opacity-100',
          )}
        >
          <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
            <button
              type="button"
              aria-label={phase === 'playing' ? '一時停止' : '再生'}
              disabled={!hasPicture}
              onClick={toggle}
              className={PLAYER_GLYPH_BUTTON}
            >
              {phase === 'playing' ? <PauseGlyph /> : <PlayGlyph />}
            </button>
            <button
              type="button"
              aria-label="消音"
              aria-pressed={muted}
              onClick={() => mute(!muted)}
              className={cn(
                PLAYER_GLYPH_BUTTON,
                muted && PLAYER_GLYPH_BUTTON_ON,
              )}
            >
              <VolumeIcon level={muted ? 0 : volume} />
            </button>
            <PlayerVolume level={muted ? 0 : volume} onChoose={chooseVolume} />
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
            <div className="ml-auto flex flex-wrap items-center gap-x-1 gap-y-2 max-[700px]:ml-0">
              <button
                type="button"
                aria-label="字幕"
                aria-pressed={captioned}
                onClick={toggleCaptions}
                className={cn(
                  PLAYER_GLYPH_BUTTON,
                  captioned && PLAYER_GLYPH_BUTTON_ON,
                )}
              >
                <CaptionsGlyph />
              </button>
              <LiveSettings
                container={shell}
                onOpenChange={setSettingsOpen}
                profiles={profiles}
                profile={profile}
                onChooseProfile={setProfile}
              />
              <button
                type="button"
                aria-label="全画面"
                aria-pressed={full}
                onClick={toggleFullscreen}
                className={PLAYER_GLYPH_BUTTON}
              >
                <FullscreenIcon leaving={full} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
