'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

import { cn } from '@/lib/utils'
import { formatPlayerTime } from '@/lib/format'
import type { RecordingDetail } from '@/repository/recordings'
import type { PlaybackPlan, TicketWrite } from '@/repository/videos'
import {
  PLAYBACK_PROFILE_UNASKED,
  videoPictureHref,
  videoFrameHref,
  type PlaybackProfile,
} from '@/repository/video-paths'
import {
  CaptionsGlyph,
  FullscreenIcon,
  PauseGlyph,
  PlayGlyph,
  SkipBackIcon,
  SkipForwardIcon,
  VolumeIcon,
} from '@/components/vela/icons'
import { Spinner } from '@/components/vela/progress'
import {
  PLAYER_BOARD,
  PLAYER_BUTTON,
  PLAYER_CHROME_FADE,
  PLAYER_FACE,
  PLAYER_GLYPH_BUTTON,
  PLAYER_GLYPH_BUTTON_ON,
  PLAYER_PALETTE,
  PLAYER_PICTURE,
  PLAYER_SCRIM,
} from '@/components/recordings/player-palette'
import {
  playerCommand,
  SEEK_FLASH_LASTS,
  SEEK_STEP_SECONDS,
  VOLUME_STEP_PERCENT,
} from '@/lib/player-keys'
import { PlayerVolume } from '@/components/recordings/player-volume'
import { PlayerSeek } from '@/components/recordings/player-seek'
import {
  PlayerCenter,
  type PlayerBezel,
} from '@/components/recordings/player-center'
import {
  PlayerSeekFlash,
  type SeekFlash,
} from '@/components/recordings/player-seek-flash'
import { PlayerSettings } from '@/components/recordings/player-settings'
import { AirPlayButton } from '@/components/recordings/external-player'
import {
  askWhyItWouldNotPlay,
  faultOnTheFace,
  PlaybackFaultNotice,
  type PlaybackFault,
} from '@/components/recordings/playback-fault'
import { still } from '@/components/vela/tactile'

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

/**
 * How long the hand rests before a position that costs a transcoder is asked
 * for.
 *
 * Where the picture is made as it plays, every position chosen is a new
 * request and a transcoder built behind it, and the arrows are pressed in
 * runs: five presses is five rebuilds queued behind a picture nobody is
 * waiting for any more. The mark and the reading move on every press; the
 * request waits until the presses stop.
 *
 * 400ms is longer than the keyboard's own repeat, so a key held down is one
 * request however long it is held, and longer than the gap between the taps of
 * a deliberate run, so a run is one request too. Against a rebuild that costs
 * seconds it is not a wait anybody sees. Where the file answers a byte range
 * there is nothing to rebuild, so nothing is held back.
 */
const SETTLES_BEFORE_SEEK = 400

/** What the picture is doing. */
type Phase = 'idle' | 'waiting' | 'playing' | 'paused' | 'diagnosing' | 'broken'

/**
 * What the plate over the picture reads while there is no picture yet. A
 * picture merely being waited for gets the spinner alone: how long it takes is
 * not something the screen says.
 */
const WAITING_ON: Partial<Record<Phase, string>> = {
  diagnosing: '再生できませんでした — 理由の確認中',
}

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
  /** The second being dragged out along the seek bar, while the hand holds it. */
  const [scrubbingAt, setScrubbingAt] = useState<number | null>(null)
  /**
   * The mark that answers a press in the middle of the picture, and which
   * press it is answering. The count is what makes a second press restart the
   * animation instead of being swallowed by the one still running.
   */
  const [bezel, setBezel] = useState<(PlayerBezel & { nth: number }) | null>(
    null,
  )
  /**
   * The answer to a seek, at the side the picture went towards, and how far a
   * run of presses has moved it.
   */
  const [flash, setFlash] = useState<SeekFlash | null>(null)
  /** When the seek answer went up, so a press soon after adds to it. */
  const flashedAt = useRef(0)
  /** How far ahead of the head the picture is loaded, in seconds. */
  const [buffered, setBuffered] = useState(0)
  /**
   * Why the picker could not be opened, where it could not.
   *
   * On the bar, where it was pressed: this is the only place the question is
   * asked, and a line about AirPlay standing somewhere else on the page would
   * be there for everyone who never pressed it.
   */
  const [aired, setAired] = useState<string | null>(null)
  /**
   * Whether the settings surface is open.
   *
   * It is drawn into the pane the picture is in rather than into the bar — it
   * has to be, or full screen would not show it — so it does not go down when
   * the bar does. Left to itself it stood over a picture whose controls had
   * gone, with nothing under it and no way to tell what it belonged to.
   */
  const [settingsOpen, setSettingsOpen] = useState(false)
  /**
   * Whether the settings surface was open when the press began.
   *
   * A press outside the surface dismisses it, and that press is not also a
   * press on the picture: YouTube's settings menu closes on a click over the
   * video and the video keeps playing. The surface is dismissed on the press
   * going down, so by the time the click arrives the state already says shut —
   * which is why what it said at `pointerdown` is what the click has to read.
   */
  const dismissing = useRef(false)
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
   * Where the marks stand, when that is not where the element is: the position
   * chosen by hand, until the element reports having reached it. A run of
   * presses steps from here rather than from the state, which is one render
   * behind while the presses are arriving faster than React draws.
   */
  const wanted = useRef<number | null>(null)
  /** The timer that will ask for the position the marks are standing at. */
  const asking = useRef<ReturnType<typeof setTimeout> | null>(null)

  /**
   * Which attempt an answer belongs to. A reason is asked for over the network
   * and arrives after the press that started it, so an answer about a picture
   * nobody is waiting for any more is dropped rather than drawn.
   */
  const attempt = useRef(0)

  const duration = d.lengthSec ?? 0
  const drops = d.qualitySpots?.map((spot) => spot.second)
  const chromeUp =
    phase !== 'playing' ||
    stirred ||
    onTheBar ||
    held ||
    scrubbingAt !== null ||
    settingsOpen

  // useEffect exception: browser API (the document's fullscreen element) +
  // listener cleanup. Leaving fullscreen by Esc is not a press this component
  // sees, and the control that says "leave" is inside the picture now.
  useEffect(() => {
    const read = () => setFull(document.fullscreenElement === shell)

    document.addEventListener('fullscreenchange', read)

    return () => document.removeEventListener('fullscreenchange', read)
  }, [shell])

  /*
    useEffect exception: a browser API on mount. The screen's subject is this
    player, and the keys are the player's while it has the focus (WCAG 2.1.4),
    so the screen hands it the focus as it opens — otherwise the first Space
    anyone presses goes to `<body>` and does nothing.

    `preventScroll`, or the page jumps to the picture on open and the reading
    above it is skipped past.
  */
  useEffect(() => {
    shell?.focus({ preventScroll: true })
  }, [shell])

  // useEffect exception: clearing a timer on unmount. Nothing is read or
  // synced here; the timer is started by a pointer and would otherwise fire
  // into a component that has gone.
  useEffect(
    () => () => {
      if (settling.current) {
        clearTimeout(settling.current)
      }

      if (asking.current) {
        clearTimeout(asking.current)
      }
    },
    [],
  )

  /**
   * Whether the reader has aimed at this player, as against the screen having
   * handed it the focus when it opened.
   *
   * Only the arrows read it. They are the page's way down a page, and this
   * screen has the recording's own record under the picture; a player that
   * took them from the moment it opened would leave no way to scroll there
   * without a pointer. video.js does not give the arrows to the player at all
   * — its sliders own them — and Shaka passes them only when the seek bar has
   * the focus or the picture is full screen. Both are saying the same thing:
   * the arrows belong to whatever the reader has actually reached.
   *
   * Pressing the picture is aiming. Tabbing into the bar is aiming. Opening
   * the screen is not.
   *
   * A ref and not state: nothing is drawn from it, and a press that arrives in
   * the same tick as the aim — which a test does, and a fast hand can — would
   * read a value React has not re-rendered yet.
   */
  const aimed = useRef(false)

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
    if (asking.current) {
      clearTimeout(asking.current)
      asking.current = null
    }

    wanted.current = null
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

  /**
   * Answer a press in the middle of the picture. For the transport that is the
   * glyph of the state being moved to, which is what YouTube's bloom carries;
   * for the sound it is the speaker at its new level and the level in words.
   * The count rises on every press so that pressing twice quickly is two
   * answers rather than one.
   */
  const answer = (what: PlayerBezel) =>
    setBezel((last) => ({ ...what, nth: (last?.nth ?? 0) + 1 }))

  /**
   * Answer a seek at the side it went towards, adding to the count if the last
   * answer is still on the picture and went the same way.
   */
  const answerSeek = (way: 'back' | 'forward') => {
    const now = Date.now()
    const running = now - flashedAt.current < SEEK_FLASH_LASTS

    flashedAt.current = now
    setFlash((last) => ({
      way,
      seconds:
        running && last?.way === way
          ? last.seconds + SEEK_STEP_SECONDS
          : SEEK_STEP_SECONDS,
      nth: (last?.nth ?? 0) + 1,
    }))
  }

  const toggle = () => {
    const element = video.current

    if (phase === 'idle' || phase === 'broken' || !element || !source) {
      answer({ was: 'play' })
      play(position)

      return
    }

    if (element.paused) {
      answer({ was: 'play' })
      void element.play().catch(() => setPhase('paused'))

      return
    }

    answer({ was: 'pause' })
    element.pause()
  }

  const choose = (second: number) => {
    const at = Math.min(duration, Math.max(0, second))

    wanted.current = at
    setPosition(at)

    // A stream handed over as it is answers a byte range, so the position moves
    // inside the picture already loaded, and there is nothing to wait for.
    if (plan.seeking === 'byRange' && video.current && source) {
      video.current.currentTime = at

      return
    }

    // One made as it plays does not: the second chosen is a new request, and
    // the transcoder behind it is built again. The mark is already there; the
    // request goes once the presses stop, so a run of them costs one rebuild
    // rather than one each.

    if (asking.current) {
      clearTimeout(asking.current)
    }

    asking.current = setTimeout(() => play(at), SETTLES_BEFORE_SEEK)
  }

  /** Along from wherever the marks stand, which is ahead of the picture while a request is waiting. */
  const step = (by: number) => {
    answerSeek(by < 0 ? 'back' : 'forward')
    choose((wanted.current ?? position) + by)
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

  /**
   * The level the bar is showing, read off the element rather than the state.
   *
   * Silent reads as nought whatever level the mute is holding, so a press after
   * a mute moves from where the eye is rather than from where the sound was.
   * The element is asked because a run of presses arrives faster than React
   * draws: read from the state, the second press of a run would compute the
   * same step as the first and the level would move once for two presses.
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

  /** Silence, without losing where the level was set. */
  const mute = (quiet: boolean) => {
    const element = video.current
    const level = !quiet && volume === 0 ? 1 : volume

    setMuted(quiet)
    setVolume(level)
    // Silence is 0%, which is what the speaker beside the level says too — the
    // two answers agree rather than one reading 0 while the other reads 40.
    answer({ was: 'volume', level: quiet ? 0 : level })

    if (element) {
      element.volume = level
      element.muted = quiet
    }
  }

  const toggleFullscreen = () => {
    // A browser may refuse either of these — a frame without the permission,
    // a press it did not read as a gesture. Nothing is drawn from the call, so
    // there is nothing to correct: what the bar reads comes from the
    // `fullscreenchange` listener above, which says nothing after a refusal
    // because nothing changed.
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined)

      return
    }

    void shell?.requestFullscreen?.().catch(() => undefined)
  }

  /**
   * The keys, once the player has the focus — and the screen hands it the
   * focus as it opens, so they work without aiming at anything first.
   *
   * Scoped to the focus and not to the document. Every player that was
   * measured is: Plyr's `window` binding is opt-in and its README says it is
   * only safe with one player on a page, video.js binds to the player element,
   * Shaka promotes to `window` only in full screen, media-chrome binds to
   * `<media-controller>`. WCAG 2.1.4 is why — a single-character shortcut has
   * to be switchable off, remappable, or **active only while the component has
   * focus**, and the third is the one that costs nothing to keep. A handler on
   * the document would put the first two on us.
   *
   * What was broken was never the scope, it was that nothing held the focus:
   * the screen opened with it on `<body>` and the first Space did nothing.
   *
   * Three guards keep a press that was meant for something else, and all three
   * read the element the press landed on: `typingIn` for the reader writing,
   * `answersItself` for a control whose own activation key this is, and
   * `aimed` for the arrows.
   */
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const command = playerCommand(event, {
      seeks: duration > 0,
      aimed: aimed.current,
    })

    if (!command) {
      return
    }

    // Only now: a press the player did not take must not raise the bar, or
    // typing anywhere on the page would flash chrome over the picture.
    stir()
    event.preventDefault()

    switch (command) {
      case 'toggle':
        toggle()
        break
      case 'back':
        step(-SEEK_STEP_SECONDS)
        break
      case 'forward':
        step(SEEK_STEP_SECONDS)
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
    }
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
        tabIndex={-1}
        data-slot="player"
        style={PLAYER_PALETTE}
        onPointerMove={stir}
        onPointerLeave={stir}
        onPointerDown={() => {
          aimed.current = true
        }}
        onKeyDown={onKeyDown}
        data-up={chromeUp ? 'true' : undefined}
        /*
          The pointer goes with the bar. Every player hides it — video.js
          spells it `.vjs-fullscreen.vjs-user-inactive { cursor: none }` — and
          a pointer left standing on a picture is the one piece of chrome that
          never fades, sitting wherever the hand happened to stop.
        */
        className={PLAYER_BOARD}
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
            onProgress={(event) => {
              const ranges = event.currentTarget.buffered

              setBuffered(
                ranges.length > 0 ? from + ranges.end(ranges.length - 1) : 0,
              )
            }}
            onTimeUpdate={(event) => {
              // While a request for a chosen position is still on its way, the
              // element is playing the second the reader has moved away from.
              if (asking.current) {
                return
              }

              wanted.current = null
              setPosition(from + event.currentTarget.currentTime)
            }}
            className={cn(PLAYER_PICTURE, '[:fullscreen_&]:max-w-none')}
          />
          {/*
            The picture answers the pointer the way every player does: one
            press runs it or stops it, two put it on the whole screen. The
            second press of a double is itself the undo of the first, so a
            picture that was running is still running once it fills the screen,
            and a single press does not have to wait on a double-press clock to
            find out whether it was one.

            The picture and not a control. The control that says 再生 is on the
            bar, named and in the tab order; a second one here would be read out
            twice and would have to be tabbed past to reach anything. So this is
            the picture answering a press — no role, nothing in the reading —
            and the press hands the focus to the player rather than taking it,
            which is what puts the keys on the picture that was just clicked.
          */}
          <div
            data-slot="player-press"
            onMouseDown={(event) => {
              event.preventDefault()
              dismissing.current = settingsOpen
              // `preventScroll`, because a press must not move the picture out
              // from under the hand between the press going down and coming
              // up — the click would then be delivered to whatever the pointer
              // was left over, and the press would read as having done nothing.
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
            /*
              The pointer goes down with the bar. Every player does it —
              YouTube's is `.ytp-autohide{cursor:none}`, and it applies
              windowed and not only full screen — because a pointer left
              standing on a picture is the one piece of chrome that never
              fades, sitting wherever the hand happened to stop.

              It is said here and not on the whole player: the bar's own
              controls have cursors of their own to say, and a rule on the
              board would be what the pointer lands on instead of theirs.
            */
            className="absolute inset-0 cursor-none select-none data-[up]:cursor-pointer"
          />
          {/*
            The middle of the picture. A stopped picture carries the mark that
            says so, and every press is answered there whether it came from the
            bar, from the picture or from a key — the bar is at the bottom edge
            and a key is nowhere, while the eye is in the middle.

            Drawn after the press area and not inside it, so it is never what
            answers a press: it has no pointer events at all, and the press
            goes through to the picture underneath.
          */}
          <PlayerCenter
            standing={
              phase === 'idle' || phase === 'paused' ? 'play' : undefined
            }
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
          <PlayerSeekFlash flash={flash ?? undefined} />
          {(phase === 'waiting' || phase === 'diagnosing') && (
            // Over the middle, on a plate of its own. Japanese recordings carry
            // their subtitles burnt into the bottom of the picture, so anything
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
            onFocus={(event) => {
              const reached =
                event.target instanceof Element &&
                event.target.matches(':focus-visible')

              setHeld(reached)

              if (reached) {
                aimed.current = true
              }
            }}
            onBlur={() => setHeld(false)}
            style={{ backgroundImage: PLAYER_SCRIM }}
            className={cn(
              'absolute inset-x-0 bottom-0 z-10 px-4 pt-14 pb-3 max-[700px]:px-3',
              'pointer-events-none translate-y-2 opacity-0',
              PLAYER_CHROME_FADE,
              'data-[up]:pointer-events-auto data-[up]:translate-y-0 data-[up]:opacity-100',
              'has-[:focus-visible]:pointer-events-auto has-[:focus-visible]:translate-y-0 has-[:focus-visible]:opacity-100',
            )}
          >
            {duration > 0 && (
              <PlayerSeek
                id={d.id}
                duration={duration}
                position={position}
                buffered={buffered}
                drops={drops}
                marks={d.seek}
                onChoose={choose}
                onScrubbing={setScrubbingAt}
                frameHref={frameHref}
              />
            )}
            {aired && (
              <p
                role="status"
                className="mt-2 text-[11px] font-medium text-[#EC9A93]"
              >
                {aired}
              </p>
            )}
            {/* The seek bar is 18px tall and its 44px area reaches 13px past
              it; the glyph buttons are 40px and theirs reaches 2px. 20px
              between the two rows leaves 5px of clear air, so neither answers
              a press meant for the other. */}
            <div className="mt-5 flex flex-wrap items-center gap-x-1 gap-y-2">
              <button
                type="button"
                aria-label={phase === 'playing' ? '一時停止' : '再生'}
                onClick={toggle}
                className={PLAYER_GLYPH_BUTTON}
              >
                {phase === 'playing' ? <PauseGlyph /> : <PlayGlyph />}
              </button>
              {/*
                The two skips, beside the transport and in the order every
                player that is not live puts them: back, then forward, then
                the reading of where the playhead is. Netflix draws them on
                the bar and YouTube leaves them to a double tap; drawn is the
                one of the two a reader can find without being told.

                They are the arrow keys with a face on them, so they call what
                the keys call and inherit the run-of-presses rule with it: on a
                route that rebuilds a transcoder, ten presses move the mark ten
                times and ask once.

                Only where there is a position to move along — the same
                condition the seek bar itself is drawn under. A recording whose
                length is not known has no bar for these to mirror.
              */}
              {duration > 0 && (
                <>
                  <button
                    type="button"
                    aria-label={`${SEEK_STEP_SECONDS}秒戻る`}
                    onClick={() => step(-SEEK_STEP_SECONDS)}
                    className={PLAYER_GLYPH_BUTTON}
                  >
                    <SkipBackIcon seconds={SEEK_STEP_SECONDS} />
                  </button>
                  <button
                    type="button"
                    aria-label={`${SEEK_STEP_SECONDS}秒進む`}
                    onClick={() => step(SEEK_STEP_SECONDS)}
                    className={PLAYER_GLYPH_BUTTON}
                  >
                    <SkipForwardIcon seconds={SEEK_STEP_SECONDS} />
                  </button>
                </>
              )}
              {/*
                The sound, beside the transport. Both references put it there —
                YouTube's speaker comes straight after the transport and before
                the reading, Netflix's after its two skips — and it was on the
                far right here, which is a place neither of them uses. The
                speaker before the level, so that the switch is the thing the
                hand lands on first and the level is what it slides into.
              */}
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
              <PlayerVolume
                level={muted ? 0 : volume}
                onChoose={chooseVolume}
              />
              {/*
                The reading, beside the transport as every player puts it, and
                spelled the way every player spells it: `26:12 / 1:54:03`, with
                the hour carried only by a recording that has one.
              */}
              <span className="ml-2 font-code text-[13px] font-medium whitespace-nowrap text-(--pl-ink) tabular-nums">
                {formatPlayerTime(scrubbingAt ?? position)} /{' '}
                {formatPlayerTime(duration)}
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
              <div className="ml-auto flex flex-wrap items-center gap-x-1 gap-y-2 max-[700px]:ml-0">
                {/*
                  The picker is a player control everywhere it exists — Safari's
                  own `<video>` chrome, YouTube's Cast, Netflix, Disney+ all put
                  it in the bar — and it needs the element that is playing, which
                  only the bar has. It used to stand on a band under the picture
                  (v3.35).
                */}
                <AirPlayButton
                  id={d.id}
                  onTakeTicket={onTakeTicket}
                  video={video}
                  onRefused={setAired}
                />
                <button
                  type="button"
                  disabled
                  aria-label="字幕"
                  aria-pressed={false}
                  title={NOT_WIRED}
                  className={PLAYER_GLYPH_BUTTON}
                >
                  <CaptionsGlyph />
                </button>
                <PlayerSettings
                  container={shell}
                  onOpenChange={setSettingsOpen}
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
                  className={PLAYER_GLYPH_BUTTON}
                >
                  <FullscreenIcon leaving={full} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
