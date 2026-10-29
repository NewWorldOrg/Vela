'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/utils'
import type { LiveStartup, LiveStartupSegment } from '@/lib/live-wire'
import type { LiveChannel, LiveProfile } from '@/repository/live'
import {
  soundsOnAir,
  splitsDualMono,
  type SoundTrack,
} from '@/repository/sounds'
import {
  liveSeat,
  soundBeingHeard,
  soundChoiceStillStands,
  wireKey,
  type SoundChoice,
} from '@/lib/live-seat'
import {
  liveChannelOf,
  livePlaylistHref,
  liveWireHref,
} from '@/repository/live-paths'
import {
  KEY_CAP,
  aimsAtThePlayer,
  routeKey,
  VOLUME_STEP_PERCENT,
} from '@/lib/player-keys'
import { DataBroadcastFeed } from '@/lib/data-broadcast-feed'
import {
  AUTO_OPEN_SPELLING,
  DATA_BROADCAST_AUTO_OPEN,
  DATA_BROADCAST_HYBRIDCAST,
  DATA_BROADCAST_LINE,
  DATA_BROADCAST_RECEIVER_ID,
  HYBRIDCAST_SPELLING,
  LINE_SPELLING,
  RECEIVER_ID_SPELLING,
} from '@/lib/stored-flag'
import {
  SAID_FAILED,
  bandPlace,
  dataBroadcastSays,
  pictureTransform,
} from '@/lib/data-broadcast-view'
import { PlayerTip } from '@/components/recordings/player-tip'
import { unaskedIn } from '@/lib/live-profiles'
import {
  FORMAT_COOKIE,
  choiceShown,
  formatChoices,
  formatToPlay,
  type FormatChoice,
  type FormatProbe,
  type PlaybackFormat,
} from '@/lib/playback-format'
import { useFormatAnswers } from '@/hooks/useFormatAnswers'
import { storeText } from '@/hooks/useStoredText'
import { browserProbe } from '@/components/vela/format-answers'
import {
  CATCH_UP_RATE,
  delayOf,
  holdOf,
  latencyTone,
  losingGround,
  reachOf,
} from '@/lib/live-latency'
import {
  CaptionsGlyph,
  CaptureIcon,
  FullscreenIcon,
  PauseGlyph,
  PictureInPictureIcon,
  PlayGlyph,
  VolumeIcon,
} from '@/components/vela/icons'
import { Spinner } from '@/components/vela/progress'
import {
  PLAYER_BOARD,
  PLAYER_BUTTON,
  PLAYER_BUTTON_ON,
  PLAYER_CHROME_FADE,
  PLAYER_CHROME_OVER,
  PLAYER_CHROME_UNDER,
  PLAYER_FACE,
  PLAYER_GLYPH_BUTTON,
  PLAYER_GLYPH_BUTTON_ON,
  PLAYER_PICTURE_BOX,
  PLAYER_LAYER,
  PLAYER_LAYER_HANDS,
  PLAYER_SCRIM,
  PLAYER_SCRIM_TOP,
  PLAYER_SEND_MAIN,
} from '@/components/recordings/player-palette'
import { PlayerVolume } from '@/components/recordings/player-volume'
import {
  SAID_CAPTURED,
  SAID_NOT_CAPTURED,
  takeCapture as takeItNow,
  type TakeCapture,
} from '@/components/recordings/take-capture'
import { capturedName, capturedOn } from '@/lib/capture-name'
import { useDataBroadcast } from '@/hooks/useDataBroadcast'
import { useRomSound } from '@/hooks/useRomSound'
import { useStoredFlag } from '@/hooks/useStoredFlag'
import { useReceiverId } from '@/hooks/useReceiverId'
import { useFullscreen } from '@/hooks/useFullscreen'
import { useHeight } from '@/hooks/useHeight'
import { usePhoneOnItsSide, usePlayerFit } from '@/hooks/usePlayerFit'
import {
  SETTLE_WHILE_THE_BAR_SIZES_THE_BOARD,
  wideRowWidth,
} from '@/lib/player-fit'
import { usePictureInPicture } from '@/hooks/usePictureInPicture'
import {
  PlayerCenter,
  type PlayerBezel,
} from '@/components/recordings/player-center'

import {
  DataBroadcastBand,
  DataBroadcastFace,
  DataBroadcastToggle,
  DataBroadcastRemote,
  widestColumn,
} from '@/components/data-broadcast/data-broadcast-player'
import { HybridcastFace } from '@/components/data-broadcast/hybridcast-frame'
import { eventInformationOf } from '@/lib/hybridcast/event-information'
import { applicationStarter, liveLine } from '@/lib/data-broadcast-line'
import { liveLineRelay } from '@/components/data-broadcast/line-relay'
import type { LineRelay } from '@/repository/live-data-broadcast'

import { CaptionLayer } from '@/components/live/live-captions'
import { clearanceOf } from '@/components/recordings/caption-clearance'
import { CAPTION_GRIP } from '@/components/recordings/player-palette'
import { useCaptionBoard } from '@/hooks/useCaptionBoard'
import { PLAIN_CAPTION_STYLE, type CaptionStyle } from '@/lib/caption-style'
import { LiveFeed } from '@/components/live/live-feed'
import {
  openPlaylist as openThePlaylist,
  type OpenPlaylist,
} from '@/components/live/live-playlist'
import { useLiveCarriage } from '@/hooks/useLiveCarriage'
import { LiveStart } from '@/components/live/live-start'
import {
  askLiveBacklog,
  askWhetherSignedOut,
  openLiveSession,
  type AskBacklog,
  type OpenSocket,
} from '@/components/live/live-session'
import { LiveFaultNotice, type LiveFault } from '@/components/live/live-notice'
import {
  holdWireFormat,
  holdWireProfile,
} from '@/components/live/live-wire-ahead'
import { LiveSettings } from '@/components/live/live-settings'
import type { GearAction } from '@/components/recordings/player-gear'
import { LiveStartupSteps } from '@/components/live/live-startup'

const RESTS = 3000

/** What the seat says of the format while the browser has not answered: a seat of its own, on which nothing is opened. */
const FORMAT_BEING_ASKED = 'asking'

const TICK_MS = 250

const BACKLOG_EVERY_MS = 2000

const STARTUP_DEADLINE_MS = 45000

type Phase = 'starting' | 'buffering' | 'playing' | 'paused' | 'faulted'

interface Retries {
  of: string
  count: number
  after: LiveFault['kind']
}

interface Running {
  key: string
  phase: Phase
  fault: LiveFault | null
  startup: LiveStartup
  elapsedMs: number
  latency?: number
  catchingUp: boolean
  losing: boolean
  dropped?: number
  droppedByThoseStillWatching?: number
  lostOnTheWayIn?: number
}

function begun(key: string): Running {
  return {
    key,
    phase: 'starting',
    fault: null,
    startup: {},
    elapsedMs: 0,
    catchingUp: false,
    losing: false,
  }
}

const LATENCY_TONE = {
  ok: 'border-(--pl-ok)/45 bg-(--pl-ok)/12 text-(--pl-ok-ink)',
  warn: 'border-(--pl-warn)/50 bg-(--pl-warn)/14 text-(--pl-warn)',
  err: 'border-(--pl-err)/50 bg-(--pl-err)/14 text-(--pl-err)',
} as const

export function LivePlayer({
  channel,
  profiles,
  returnPath,
  openSocket,
  askSignedOut = askWhetherSignedOut,
  askBacklog = askLiveBacklog,
  wireHref = liveWireHref,
  openPlaylist = openThePlaylist,
  playlistHref = livePlaylistHref,
  startupDeadlineMs = STARTUP_DEADLINE_MS,
  takeCapture = takeItNow,
  autoOpensDataBroadcast = false,
  lineRelayOf = liveLineRelay,
  remoteInTheColumn = false,
  remoteSlot = null,
  onDataBroadcastOpen,
  captionStyle: storedCaptionStyle = PLAIN_CAPTION_STYLE,
  formatChoice: storedFormat = 'auto',
  askBrowser,
}: {
  channel?: LiveChannel
  profiles: LiveProfile[]
  returnPath: string
  openSocket?: OpenSocket
  askSignedOut?: () => Promise<boolean>
  askBacklog?: AskBacklog
  wireHref?: (
    networkId: number,
    serviceId: number,
    profile: string,
    sound: SoundTrack,
    format?: PlaybackFormat,
  ) => string
  openPlaylist?: OpenPlaylist
  playlistHref?: (
    networkId: number,
    serviceId: number,
    profile: string,
    sound: SoundTrack,
  ) => string
  startupDeadlineMs?: number
  takeCapture?: TakeCapture
  autoOpensDataBroadcast?: boolean
  lineRelayOf?: (channel: string) => LineRelay
  /** The page has a column beside the player to hold the remote, and the window is wide enough to show it. */
  remoteInTheColumn?: boolean
  /** Where in the column the remote is drawn; none while the column is folded or shows the channels. */
  remoteSlot?: HTMLElement | null
  onDataBroadcastOpen?: (open: boolean) => void
  captionStyle?: CaptionStyle
  /** The format this browser was left on, as its cookie says. */
  formatChoice?: FormatChoice
  /** What is asked whether a format plays here, in place of this browser. */
  askBrowser?: FormatProbe
}) {
  const video = useRef<HTMLVideoElement>(null)
  const overlay = useRef<HTMLCanvasElement>(null)
  const captions = useRef<CaptionLayer | null>(null)
  const [captioned, setCaptioned] = useState(true)
  const {
    board: captionBoard,
    style: captionStyle,
    setStyle: setCaptionStyle,
    grip: captionGrip,
  } = useCaptionBoard(storedCaptionStyle)
  const [broadcastFeed] = useState(() => new DataBroadcastFeed())
  const [shell, setShell] = useState<HTMLElement | null>(null)
  const [chrome, setChrome] = useState<HTMLDivElement | null>(null)
  const { full, filled, toggle: toggleFullscreen } = useFullscreen(shell)
  const [profile, setProfile] = useState(() => unaskedIn(profiles))
  const carriage = useLiveCarriage()
  const playlist = carriage === 'playlist'

  useEffect(() => holdWireProfile(profile), [profile])
  const [formatChoice, setFormatChoice] = useState(storedFormat)
  const answersOf = useFormatAnswers(
    askBrowser ?? browserProbe('plainFirst'),
    profiles,
  )
  const picture = profiles.find((one) => one.name === profile)
  const formatAnswers = picture && answersOf(picture)
  const settled = formatToPlay(formatChoice, picture?.formats, formatAnswers)
  const formatSettled = settled.settled
  const format = settled.settled ? settled.format : undefined
  const formatsToChoose = formatChoices(picture?.formats, formatAnswers)

  useEffect(
    () =>
      holdWireFormat(
        formatSettled ? { settled: true, format } : { settled: false },
      ),
    [formatSettled, format],
  )
  const [chosenSound, setChosenSound] = useState<SoundChoice | null>(null)
  const [retries, setRetries] = useState<Retries | null>(null)
  const [held, setHeld] = useState<Running | null>(null)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [said, setSaid] = useState<{
    text: string
    tone: 'ok' | 'err'
  } | null>(null)

  const [stirred, setStirred] = useState(false)
  const [onTheBar, setOnTheBar] = useState(false)
  const [focused, setFocused] = useState(false)
  const [bezel, setBezel] = useState<(PlayerBezel & { nth: number }) | null>(
    null,
  )
  const [settingsOpen, setSettingsOpen] = useState(false)
  const dismissing = useRef(false)
  const settling = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stalls = useRef(0)

  const networkId = channel?.networkId
  const serviceId = channel?.serviceId
  const onAir = channel?.now
  const sounds: readonly SoundTrack[] = onAir
    ? soundsOnAir(onAir.sounds, onAir.audio)
    : []
  const split = onAir ? splitsDualMono(onAir.sounds, onAir.audio) : false
  const standing = soundChoiceStillStands(chosenSound, channel?.id, sounds)

  if (standing !== chosenSound) {
    setChosenSound(standing)
  }

  const sound = soundBeingHeard(standing)
  const ready = playlist || formatSettled
  const formatAsked = playlist ? undefined : format
  const seat = liveSeat(
    networkId,
    serviceId,
    profile,
    sound,
    split,
    ready ? formatAsked : FORMAT_BEING_ASKED,
  )
  const retried = retries && retries.of === seat ? retries : null
  const attempt = retried?.count ?? 0
  const key = wireKey(seat, attempt)

  const reconnecting =
    retried && (retried.after === 'dropped' || retried.after === 'ended')
      ? retried.count
      : undefined

  const running: Running | null =
    key === null ? null : held && held.key === key ? held : begun(key)
  const phase = running?.phase
  const fault = running?.fault ?? null
  const [autoOpens] = useStoredFlag(
    DATA_BROADCAST_AUTO_OPEN,
    AUTO_OPEN_SPELLING,
    autoOpensDataBroadcast,
  )
  const relay = useMemo(
    () =>
      networkId === undefined || serviceId === undefined
        ? null
        : lineRelayOf(liveChannelOf(networkId, serviceId)),
    [networkId, serviceId, lineRelayOf],
  )
  const [allowsTheLine] = useStoredFlag(
    DATA_BROADCAST_LINE,
    LINE_SPELLING,
    false,
  )
  const [handsTheReceiverId] = useStoredFlag(
    DATA_BROADCAST_RECEIVER_ID,
    RECEIVER_ID_SPELLING,
    false,
  )
  const [allowsHybridcast] = useStoredFlag(
    DATA_BROADCAST_HYBRIDCAST,
    HYBRIDCAST_SPELLING,
    false,
  )
  const receiverId = useReceiverId(relay, allowsTheLine && handsTheReceiverId)
  const line = liveLine(
    { allowsTheLine, handsTheReceiverId, allowsHybridcast },
    receiverId,
    relay,
  )
  const romSounds = useRomSound(muted ? 0 : volume)
  const broadcast = useDataBroadcast(
    broadcastFeed,
    key,
    {
      autoOpens,
      programme: onAir?.startsAt ?? '',
    },
    applicationStarter(line),
    romSounds,
  )

  useEffect(
    () => () => {
      if (settling.current) {
        clearTimeout(settling.current)
      }
    },
    [],
  )

  useEffect(() => {
    const element = video.current

    if (
      key === null ||
      networkId === undefined ||
      serviceId === undefined ||
      profile === undefined ||
      carriage === undefined ||
      !ready ||
      !element
    ) {
      return
    }

    let gone = false

    const change = (patch: (was: Running) => Running) => {
      if (gone) {
        return
      }

      setHeld((was) => patch(was && was.key === key ? was : begun(key)))
    }

    let settled = false

    element.playbackRate = 1
    stalls.current = 0

    const fail = (why: LiveFault) => {
      if (settled || gone) {
        return
      }

      settled = true
      change((was) => ({ ...was, phase: 'faulted', fault: why }))
      element.pause()
    }

    if (carriage === 'none') {
      const saying = setTimeout(() => fail({ kind: 'unsupported' }), 0)

      return () => clearTimeout(saying)
    }

    let pictured = false
    const openedAt = performance.now()
    const seated = { networkId, serviceId, profile, format: formatAsked, sound }
    let askedAt = -BACKLOG_EVERY_MS
    let asking = false

    const mark = (segment: LiveStartupSegment) => {
      const at = Math.round(performance.now() - openedAt)

      change((was) =>
        was.startup[segment] === undefined
          ? { ...was, startup: { ...was.startup, [segment]: at } }
          : was,
      )
    }

    const pictureCame = () => {
      if (pictured) {
        return
      }

      pictured = true
      mark('firstPicture')
      change((was) =>
        was.phase === 'starting' ? { ...was, phase: 'buffering' } : was,
      )
    }

    const droppedOrSignedOut = () => {
      void askSignedOut().then((signedOut) =>
        fail(signedOut ? { kind: 'signedOut' } : { kind: 'dropped' }),
      )
    }

    const askTheBacklog = (elapsedMs: number) => {
      if (asking || elapsedMs - askedAt < BACKLOG_EVERY_MS) {
        return
      }

      asking = true
      askedAt = elapsedMs

      void askBacklog(seated).then((read) => {
        asking = false

        if (settled || !read) {
          return
        }

        change((was) =>
          was.dropped === read.dropped &&
          was.droppedByThoseStillWatching ===
            read.droppedByThoseStillWatching &&
          was.lostOnTheWayIn === read.lostOnTheWayIn
            ? was
            : {
                ...was,
                dropped: read.dropped,
                droppedByThoseStillWatching: read.droppedByThoseStillWatching,
                lostOnTheWayIn: read.lostOnTheWayIn,
              },
        )
      })
    }

    const startedInTime = (elapsedMs: number, leave: () => void) => {
      if (pictured || elapsedMs < startupDeadlineMs) {
        return true
      }

      leave()
      fail({ kind: 'tookTooLong' })

      return false
    }

    if (carriage === 'playlist') {
      const played = openPlaylist(
        element,
        playlistHref(networkId, serviceId, profile, sound),
        {
          onPicture: pictureCame,
          onRefusedToPlay: () => change((was) => ({ ...was, phase: 'paused' })),
          onFault: (why) => {
            if (why === 'unsupported') {
              fail({ kind: 'unsupported' })

              return
            }

            droppedOrSignedOut()
          },
        },
      )

      const waiting = setInterval(() => {
        const elapsedMs = performance.now() - openedAt

        if (settled || !startedInTime(elapsedMs, played.leave)) {
          clearInterval(waiting)

          return
        }

        change((was) =>
          was.phase === 'starting' ? { ...was, elapsedMs } : was,
        )
        askTheBacklog(elapsedMs)
      }, TICK_MS)

      return () => {
        gone = true
        clearInterval(waiting)
        played.leave()
      }
    }

    let edge = -1
    let edgeMovedAt = performance.now()
    let quickenedSince: number | null = null
    let gapWhenQuickened = 0

    const feed = new LiveFeed(
      element,
      (why) => {
        session.leave()
        fail({ kind: why })
      },
      () => {
        if (!settled && !gone) {
          starter.check()
        }
      },
    )

    const starter = new LiveStart(element, feed, () =>
      change((was) => ({ ...was, phase: 'paused' })),
    )

    const layer = overlay.current
      ? new CaptionLayer(overlay.current, element, captionBoard)
      : null

    captions.current = layer
    broadcastFeed.reset()

    const session = openLiveSession(
      wireHref(networkId, serviceId, profile, sound, format),
      {
        onHeader: (init) => {
          feed.header(init)
          mark('initReached')
        },
        onPicture: (bytes) => {
          feed.append(bytes)
          pictureCame()
        },
        onCaptionCanvas: (canvas) => layer?.canvasOf(canvas),
        onCaption: (picture, pts) => layer?.offer(picture, pts),
        onDataBroadcast: (payload, pts) => {
          broadcastFeed.offer(payload, pts)
          broadcastFeed.advance(element.currentTime)
        },
        onProgress: (reported) =>
          change((was) => ({
            ...was,
            startup: { ...was.startup, ...reported },
          })),
        onRefusal: (refusal, over) =>
          fail({ kind: 'refused', refusal, ...over }),
        onEnding: (why) => fail({ kind: 'ended', why }),
        onDropped: droppedOrSignedOut,
      },
      openSocket,
    )

    const following = setInterval(
      () => broadcastFeed.advance(element.currentTime),
      TICK_MS,
    )

    const ticking = setInterval(() => {
      if (settled) {
        clearInterval(ticking)

        return
      }

      const now = performance.now()
      const elapsedMs = now - openedAt

      if (!startedInTime(elapsedMs, session.leave)) {
        clearInterval(ticking)

        return
      }

      change((was) => (was.phase === 'starting' ? { ...was, elapsedMs } : was))
      askTheBacklog(elapsedMs)

      const runs = feed.runs()
      const end = feed.end()
      const start = feed.start()

      if (end === undefined || start === undefined) {
        return
      }

      if (end > edge) {
        edge = end
        edgeMovedAt = now
      }

      if (!starter.started) {
        starter.check()

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

      if (!catchingUp) {
        quickenedSince = null
      } else if (quickenedSince === null) {
        quickenedSince = now
        gapWhenQuickened = behind
      }

      const latency = delayOf({
        behind,
        stalledFor: (now - edgeMovedAt) / 1000,
      })
      const losing = losingGround(
        quickenedSince === null
          ? null
          : {
              forSeconds: (now - quickenedSince) / 1000,
              gapWas: gapWhenQuickened,
              gapIs: behind,
            },
      )

      change((was) =>
        was.latency === latency &&
        was.catchingUp === catchingUp &&
        was.losing === losing
          ? was
          : { ...was, latency, catchingUp, losing },
      )
    }, TICK_MS)

    return () => {
      gone = true
      clearInterval(ticking)
      clearInterval(following)
      session.leave()
      feed.close()
      layer?.close()
      captions.current = null
      broadcastFeed.reset()
    }
  }, [
    broadcastFeed,
    captionBoard,
    key,
    networkId,
    serviceId,
    profile,
    sound,
    carriage,
    ready,
    format,
    formatAsked,
    openSocket,
    askSignedOut,
    askBacklog,
    wireHref,
    openPlaylist,
    playlistHref,
    startupDeadlineMs,
  ])

  const heard = (patch: (was: Running) => Running) => {
    if (key === null) {
      return
    }

    setHeld((was) => patch(was && was.key === key ? was : begun(key)))
  }

  const pip = usePictureInPicture(video)
  const captionsDrawn =
    captioned && !playlist && !pip.out && phase !== 'faulted'
  const broadcastOffered = broadcast.offered && !playlist
  const hasPicture =
    phase === 'playing' || phase === 'paused' || phase === 'buffering'
  const chromeUp =
    phase !== 'playing' ||
    stirred ||
    onTheBar ||
    focused ||
    settingsOpen ||
    pip.out

  const capture = async () => {
    const got = await takeCapture({
      video: video.current,
      name: capturedName(channel?.name ?? '', capturedOn(Date.now())),
      over: (context, size) => captions.current?.drawOn(context, size),
    })

    broadcast.quiet()
    setSaid(
      got === 'saved'
        ? { text: SAID_CAPTURED, tone: 'ok' }
        : { text: SAID_NOT_CAPTURED, tone: 'err' },
    )
  }

  const aimed = useRef(false)

  const stir = () => {
    if (settling.current) {
      clearTimeout(settling.current)
    }

    setStirred(true)
    settling.current = setTimeout(() => setStirred(false), RESTS)
  }

  const answer = (what: PlayerBezel) =>
    setBezel((last) => ({ ...what, nth: (last?.nth ?? 0) + 1 }))

  const toggle = () => {
    const element = video.current

    broadcast.unlockSounds()

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

  const toggleCaptions = () => setCaptioned((was) => !was)

  const toggleBroadcast = () => {
    shell?.focus({ preventScroll: true })
    broadcast.toggle()
  }

  const hearBroadcast: typeof broadcast.hear = (message) => {
    if (message.kind === 'error') {
      stir()
    }

    broadcast.hear(message)
  }

  useEffect(() => {
    onDataBroadcastOpen?.(broadcast.view.open)
  }, [broadcast.view.open, onDataBroadcastOpen])

  const aimAtTheKeypad = () => {
    aimed.current = true
    shell?.focus({ preventScroll: true })
  }

  const runningApp = broadcast.view.hybridcast
  const appTakesD = runningApp !== null && broadcast.view.usedKeys.includes('d')
  const dataButton = appTakesD
    ? () => {
        aimAtTheKeypad()
        broadcast.press('d')
      }
    : toggleBroadcast
  const onTheBand = runningApp
    ? {
        station: channel?.name ?? '',
        onClose: () => {
          aimAtTheKeypad()
          broadcast.closeApplication()
        },
      }
    : null

  const chooseVolume = (next: number) => {
    const element = video.current

    broadcast.unlockSounds()

    setVolume(next)
    setMuted(next === 0)

    if (element) {
      element.volume = next
      element.muted = next === 0
    }
  }

  const showing = () => {
    const element = video.current

    if (!element) {
      return muted ? 0 : volume
    }

    return element.muted ? 0 : element.volume
  }

  const stepVolume = (by: number) => {
    const next =
      Math.min(100, Math.max(0, Math.round(showing() * 100) + by)) / 100

    chooseVolume(next)
    answer({ was: 'volume', level: next })
  }

  const mute = (quiet: boolean) => {
    const element = video.current

    broadcast.unlockSounds()
    const level = !quiet && volume === 0 ? 1 : volume

    setMuted(quiet)
    setVolume(level)
    answer({ was: 'volume', level: quiet ? 0 : level })

    if (element) {
      element.volume = level
      element.muted = quiet
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const route = routeKey(
      event,
      {
        seeks: false,
        captions: !playlist,
        dataBroadcast: broadcastOffered,
        aimed: aimed.current,
      },
      broadcast.view.open
        ? { usedKeys: broadcast.view.usedKeys, takesD: appTakesD }
        : null,
    )

    if (!route) {
      return
    }

    event.preventDefault()

    if (aimsAtThePlayer(route)) {
      aimed.current = true
    }

    if (route.to === 'nowhere') {
      return
    }

    if (route.to === 'dataBroadcast') {
      broadcast.press(route.key)

      return
    }

    stir()

    switch (route.command) {
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
      case 'dataBroadcast':
        toggleBroadcast()
        break
      default:
        break
    }
  }

  useEffect(() => {
    if (hasPicture) {
      shell?.focus({ preventScroll: true })
    }
  }, [shell, hasPicture])

  const latency = running?.latency
  const losing = running?.losing ?? false
  const opened = broadcast.view.open
  const fit = usePlayerFit(
    shell,
    wideRowWidth({
      glyphs:
        5 + Number(!playlist) + Number(broadcastOffered) + Number(pip.offered),
      latency:
        latency === undefined
          ? undefined
          : running?.catchingUp
            ? 'catching up'
            : 'plain',
    }),
    opened && bandPlace(full, remoteInTheColumn) !== 'over'
      ? SETTLE_WHILE_THE_BAR_SIZES_THE_BOARD
      : 0,
  )
  const sideways = usePhoneOnItsSide()
  const roomy = fit === 'wide'
  const place = bandPlace(full, remoteInTheColumn)
  const underTheBox = opened && place !== 'over'
  const compact = fit === 'compact' && !underTheBox
  const bandUnderTheBox = opened && place === 'under'
  const rowHeight = useHeight(underTheBox ? chrome : null)
  const clearsTheRow =
    captionsDrawn && chromeUp && !underTheBox && !broadcast.view.rect
  const clearance = useMemo(
    () => (clearsTheRow ? () => clearanceOf(chrome, shell) : null),
    [clearsTheRow, chrome, shell],
  )

  useEffect(() => captionBoard.clearOf(clearance), [captionBoard, clearance])

  const overThePicture = opened && place === 'over'
  const barSaid = broadcast.view.failed
    ? { text: SAID_FAILED, tone: 'err' as const }
    : said

  const chromeHands = {
    onPointerEnter: () => setOnTheBar(true),
    onPointerLeave: () => setOnTheBar(false),
    onFocus: (event: FocusEvent) => {
      const reached =
        event.target instanceof Element &&
        event.target.matches(':focus-visible')

      setFocused(reached)

      if (reached) {
        aimed.current = true
      }
    },
    onBlur: () => setFocused(false),
  }
  const playButton = (look: string) => (
    <PlayerTip
      name={phase === 'playing' ? '一時停止' : '再生'}
      keys={[KEY_CAP.toggle]}
      container={shell}
    >
      <button
        type="button"
        aria-label={phase === 'playing' ? '一時停止' : '再生'}
        disabled={!hasPicture}
        onClick={toggle}
        className={look}
      >
        {phase === 'playing' ? <PauseGlyph /> : <PlayGlyph />}
      </button>
    </PlayerTip>
  )
  const muteButton = (
    <PlayerTip name="消音" keys={[KEY_CAP.mute]} container={shell}>
      <button
        type="button"
        aria-label="消音"
        aria-pressed={muted}
        onClick={() => mute(!muted)}
        className={cn(PLAYER_GLYPH_BUTTON, muted && PLAYER_GLYPH_BUTTON_ON)}
      >
        <VolumeIcon level={muted ? 0 : volume} />
      </button>
    </PlayerTip>
  )
  const captionsButton = !playlist && (
    <PlayerTip name="字幕" keys={[KEY_CAP.captions]} container={shell}>
      <button
        type="button"
        aria-label="字幕"
        aria-pressed={captioned}
        onClick={toggleCaptions}
        className={cn(PLAYER_GLYPH_BUTTON, captioned && PLAYER_GLYPH_BUTTON_ON)}
      >
        <CaptionsGlyph />
      </button>
    </PlayerTip>
  )
  const broadcastButton = broadcastOffered && (
    <DataBroadcastToggle
      open={opened}
      onToggle={toggleBroadcast}
      container={shell}
    />
  )
  const rareActions: GearAction[] = [
    {
      name: 'キャプチャ',
      icon: <CaptureIcon />,
      disabled: !hasPicture,
      onPress: capture,
    },
    ...(pip.offered
      ? [
          {
            name: 'ピクチャーインピクチャー',
            icon: <PictureInPictureIcon />,
            disabled: !hasPicture,
            pressed: pip.out,
            onPress: pip.toggle,
          },
        ]
      : []),
  ]
  const gearButton = (
    <PlayerTip name="設定" container={shell} quiet={settingsOpen}>
      <LiveSettings
        container={shell}
        sheet={fit === 'compact' || sideways}
        full={full}
        actions={roomy ? [] : rareActions}
        onOpenChange={setSettingsOpen}
        profiles={profiles}
        profile={profile}
        onChooseProfile={setProfile}
        format={
          playlist
            ? undefined
            : {
                choices: formatsToChoose,
                chosen: choiceShown(formatChoice, formatsToChoose),
                onChoose: (next) => {
                  storeText(FORMAT_COOKIE, next)
                  setFormatChoice(next)
                },
              }
        }
        sounds={sounds}
        sound={sound}
        onChooseSound={(next) => {
          if (channel) {
            setChosenSound({ of: channel.id, track: next })
          }
        }}
        dropped={running?.dropped}
        droppedByThoseStillWatching={running?.droppedByThoseStillWatching}
        lostOnTheWayIn={running?.lostOnTheWayIn}
        captionStyle={playlist ? undefined : captionStyle}
        onCaptionStyle={setCaptionStyle}
      />
    </PlayerTip>
  )
  const captureButton = (
    <PlayerTip name="キャプチャ" container={shell}>
      <button
        type="button"
        aria-label="キャプチャ"
        disabled={!hasPicture}
        onClick={capture}
        className={PLAYER_GLYPH_BUTTON}
      >
        <CaptureIcon />
      </button>
    </PlayerTip>
  )
  const pipButton = pip.offered && (
    <PlayerTip name="ピクチャーインピクチャー" container={shell}>
      <button
        type="button"
        aria-label="ピクチャーインピクチャー"
        aria-pressed={pip.out}
        disabled={!hasPicture}
        onClick={pip.toggle}
        className={cn(PLAYER_GLYPH_BUTTON, pip.out && PLAYER_GLYPH_BUTTON_ON)}
      >
        <PictureInPictureIcon />
      </button>
    </PlayerTip>
  )
  const fullscreenButton = (
    <PlayerTip name="全画面" keys={[KEY_CAP.fullscreen]} container={shell}>
      <button
        type="button"
        aria-label="全画面"
        aria-pressed={full}
        onClick={toggleFullscreen}
        className={PLAYER_GLYPH_BUTTON}
      >
        <FullscreenIcon leaving={full} />
      </button>
    </PlayerTip>
  )

  return (
    <div data-slot="live-player-frame" className="w-full">
      <section
        ref={setShell}
        data-full={full ? 'true' : undefined}
        data-fill={filled ? 'true' : undefined}
        tabIndex={-1}
        data-slot="live-player"
        data-phase={phase ?? 'idle'}
        onPointerMove={stir}
        onPointerLeave={stir}
        onPointerDown={() => {
          aimed.current = true
        }}
        onKeyDown={onKeyDown}
        style={{
          maxWidth: widestColumn(place, underTheBox, rowHeight),
        }}
        className={PLAYER_BOARD}
      >
        <div
          data-slot="player-face"
          className={cn(
            'relative flex items-center justify-center',
            PLAYER_FACE,
            '[[data-full]_&]:aspect-auto [[data-full]_&]:max-h-none [[data-full]_&]:min-h-0 [[data-full]_&]:flex-1',
          )}
        >
          <div
            data-slot="player-stage-area"
            className="absolute inset-0 flex items-center justify-center [container-type:size]"
          >
            <div
              data-slot="player-stage"
              className={cn(
                'relative',
                opened
                  ? 'aspect-video w-[min(100cqw,calc(100cqh*16/9))]'
                  : PLAYER_PICTURE_BOX,
              )}
            >
              <div
                data-slot="player-picture"
                data-rect={
                  broadcast.view.rect
                    ? Object.values(broadcast.view.rect).join(',')
                    : undefined
                }
                style={{ transform: pictureTransform(broadcast.view.rect) }}
                className="relative size-full origin-top-left transition-transform duration-200 ease-out still:transition-none"
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
                      was.phase === 'playing'
                        ? { ...was, phase: 'paused' }
                        : was,
                    )
                  }
                  onWaiting={() => {
                    if (phase === 'playing') {
                      stalls.current += 1
                    }

                    heard((was) =>
                      was.phase === 'playing'
                        ? { ...was, phase: 'buffering' }
                        : was,
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
                  data-drawn={captionsDrawn ? 'yes' : 'no'}
                  className="pointer-events-none absolute inset-0 size-full"
                />
              </div>
              {opened && !runningApp && (
                <DataBroadcastFace
                  key={broadcast.view.returns}
                  feed={broadcastFeed}
                  onAir={{
                    network: networkId ?? null,
                    startsAt: onAir ? Date.parse(onAir.startsAt) / 1000 : null,
                  }}
                  line={line}
                  greg={broadcast.view.greg}
                  failedStarts={broadcast.view.failedStarts}
                  startup={broadcast.view.startup}
                  onRuntime={broadcast.connect}
                  onMessage={hearBroadcast}
                  says={dataBroadcastSays(broadcast.view)}
                />
              )}
              {opened && runningApp && (
                <HybridcastFace
                  app={runningApp}
                  feed={broadcastFeed}
                  service={broadcastFeed.catalog?.service ?? serviceId ?? null}
                  programme={channel ? eventInformationOf(channel) : null}
                  receiverId={line.receiverId}
                  greg={broadcast.view.greg}
                  keysTo={shell}
                  onHeard={broadcast.hearApp}
                  onSender={broadcast.connectApp}
                />
              )}
            </div>
          </div>
          {hasPicture && !pip.out && (
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
            >
              {!opened && !playlist && (
                <div
                  ref={captionGrip}
                  aria-hidden="true"
                  data-slot="player-caption-grip"
                  className={CAPTION_GRIP}
                />
              )}
            </div>
          )}
          {hasPicture && (
            <PlayerCenter
              standing={
                !compact && !pip.out && phase === 'paused' ? 'play' : undefined
              }
              onStanding={() => {
                shell?.focus({ preventScroll: true })
                toggle()
              }}
              bezel={bezel ?? undefined}
            />
          )}
          {channel && running && phase !== 'faulted' && !underTheBox && (
            <div
              data-slot="live-title"
              data-up={chromeUp ? 'true' : undefined}
              style={{ backgroundImage: PLAYER_SCRIM_TOP }}
              className={cn(
                'pointer-events-none absolute inset-x-0 top-0 z-10 px-4 pt-3 pb-10',
                compact && 'pt-4 pr-[calc(184rem/16)] pl-3',
                '-translate-y-2 opacity-0',
                PLAYER_CHROME_FADE,
                'data-[up]:translate-y-0 data-[up]:opacity-100',
              )}
            >
              <span className="block truncate text-sub text-white">
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
              brief={compact}
            />
          )}
          {pip.out && (
            <p
              role="status"
              className="pointer-events-none absolute inset-0 m-auto flex h-fit w-fit max-w-[88%] items-center justify-center rounded-full border border-white/25 bg-black/80 px-4 py-2 text-center text-ui font-medium text-(--pl-ink)"
            >
              ピクチャーインピクチャーで再生中
            </p>
          )}
          {!pip.out && phase === 'buffering' && (
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
        </div>
        {compact && key !== null && phase !== 'faulted' && (
          <div
            data-slot="player-top"
            data-up={chromeUp ? 'true' : undefined}
            {...chromeHands}
            className={cn(
              PLAYER_LAYER,
              'top-0 right-0 flex justify-end px-2 pt-1.5',
              '[[data-fill]_&]:top-[env(safe-area-inset-top)] [[data-fill]_&]:right-[env(safe-area-inset-right)]',
            )}
          >
            <div
              className={cn('flex items-center gap-x-1', PLAYER_LAYER_HANDS)}
            >
              {muteButton}
              {captionsButton}
              {broadcastButton}
              {gearButton}
            </div>
          </div>
        )}
        {compact && hasPicture && !pip.out && phase !== 'buffering' && (
          <div
            data-slot="player-sends"
            data-up={chromeUp ? 'true' : undefined}
            {...chromeHands}
            className={cn(
              PLAYER_LAYER,
              'inset-x-0 top-[calc(50%-4rem/16)] flex -translate-y-1/2 items-center justify-center',
            )}
          >
            {playButton(PLAYER_SEND_MAIN)}
          </div>
        )}
        <div
          ref={setChrome}
          data-slot="player-chrome"
          data-fit={fit}
          hidden={key === null || phase === 'faulted'}
          data-up={chromeUp ? 'true' : undefined}
          {...chromeHands}
          style={{
            backgroundImage: opened ? 'none' : PLAYER_SCRIM,
          }}
          className={
            underTheBox
              ? PLAYER_CHROME_UNDER
              : cn(
                  PLAYER_CHROME_OVER,
                  compact && 'data-[up]:pointer-events-none',
                )
          }
        >
          {overThePicture && (
            <DataBroadcastBand
              place="over"
              numbers={broadcast.view.numbers}
              onNumbers={broadcast.showNumbers}
              onKey={broadcast.press}
              onAim={aimAtTheKeypad}
              application={onTheBand}
            />
          )}
          <div
            data-slot="player-controls"
            className={cn(
              'px-4 max-[700px]:px-3',
              compact ? 'pb-2' : 'pb-3',
              opened ? 'pt-3' : compact ? 'pt-8' : 'pt-12',
            )}
          >
            {barSaid && (
              <p
                role="status"
                className={cn(
                  'mb-2 text-cap font-medium',
                  barSaid.tone === 'ok'
                    ? 'text-(--pl-ok-ink)'
                    : 'text-(--pl-err)',
                )}
              >
                {barSaid.text}
              </p>
            )}
            <div
              data-slot="player-line"
              className={cn(
                'flex flex-wrap items-center gap-x-1 gap-y-2',
                compact && PLAYER_LAYER_HANDS,
              )}
            >
              {!compact && (
                <>
                  {playButton(PLAYER_GLYPH_BUTTON)}
                  {muteButton}
                  {roomy && (
                    <PlayerTip
                      name="音量"
                      keys={[KEY_CAP.louder, KEY_CAP.quieter]}
                      container={shell}
                    >
                      <PlayerVolume
                        level={muted ? 0 : volume}
                        onChoose={chooseVolume}
                      />
                    </PlayerTip>
                  )}
                </>
              )}
              {latency !== undefined && (
                <span
                  data-slot="live-latency"
                  data-tone={latencyTone(latency, losing)}
                  className={cn(
                    'inline-flex items-center gap-[calc(7rem/16)] rounded-full border px-3 py-[calc(3rem/16)] text-note font-medium whitespace-nowrap',
                    LATENCY_TONE[latencyTone(latency, losing)],
                  )}
                >
                  <i
                    aria-hidden="true"
                    className="size-[calc(7rem/16)] shrink-0 rounded-full bg-current"
                  />
                  遅延 <span className="font-code">{latency.toFixed(1)}</span>{' '}
                  秒
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
              <div
                className={cn(
                  'ml-auto flex flex-wrap items-center gap-x-1 gap-y-2',
                  !compact && 'max-[700px]:ml-0',
                )}
              >
                {!compact && (
                  <>
                    {captionsButton}
                    {broadcastButton}
                    {gearButton}
                  </>
                )}
                {roomy && captureButton}
                {roomy && pipButton}
                {fullscreenButton}
              </div>
            </div>
          </div>
        </div>
        {bandUnderTheBox && (
          <DataBroadcastBand
            place="under"
            numbers={broadcast.view.numbers}
            onNumbers={broadcast.showNumbers}
            onKey={broadcast.press}
            onAim={aimAtTheKeypad}
            station={channel?.name ?? ''}
            application={onTheBand}
          />
        )}
        {opened &&
          place === 'column' &&
          remoteSlot &&
          createPortal(
            <DataBroadcastRemote
              station={channel?.name ?? ''}
              onKey={broadcast.press}
              onAim={aimAtTheKeypad}
              onToggle={dataButton}
              application={onTheBand}
            />,
            remoteSlot,
          )}
      </section>
    </div>
  )
}
