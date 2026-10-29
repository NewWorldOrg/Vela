'use client'

import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { Route } from 'next'

import type { BrowserDecoding } from '@/lib/browser-decodes'
import {
  FORMAT_COOKIE,
  choiceShown,
  formatChoices,
  formatToPlay,
  type FormatChoice,
  type FormatProbe,
  type FormatSettled,
  type PlaybackFormat,
} from '@/lib/playback-format'
import type { LiveProfile } from '@/repository/live'
import { useFormatAnswers } from '@/hooks/useFormatAnswers'
import { storeText } from '@/hooks/useStoredText'
import { browserProbe } from '@/components/vela/format-answers'
import {
  SAID_FAILED,
  bandPlace,
  dataBroadcastSays,
  pictureTransform,
} from '@/lib/data-broadcast-view'
import { AUTO_OPEN_SPELLING, DATA_BROADCAST_AUTO_OPEN } from '@/lib/stored-flag'
import { cn } from '@/lib/utils'
import { formatPlayerTime } from '@/lib/format'
import {
  chaptersToDraw,
  nextBoundaryAfter,
  skippableRunAt,
} from '@/lib/player-chapters'
import {
  SECOND_TAP_WITHIN,
  tapZone,
  whatTheTapDoes,
  type TapRun,
  type TapZone,
} from '@/lib/player-taps'
import { redrawnHref } from '@/lib/thumbnail-redraw'
import { useRedrawnThumbnail } from '@/hooks/useRedrawnThumbnail'
import {
  soundToAsk,
  theLandingIsStillAhead,
  whatIsStillSaid,
  whatTheSoundBecomes,
  whereItStarts,
  type PlayerSaying,
} from '@/lib/playback-sound'
import {
  theAddressStands,
  whatTheStandingArtefactAsks,
  whereThatSourceOpens,
} from '@/lib/playback-source'
import { listenForEncodeJobs } from '@/lib/app-signals'
import type { SeekMeans } from '@/repository/recording-segments'
import type { RecordingDetail } from '@/repository/recordings'
import type {
  PlaybackPlan,
  PlaybackRead,
  PositionWrite,
} from '@/repository/videos'
import { useDataBroadcast } from '@/hooks/useDataBroadcast'
import { useRomSound } from '@/hooks/useRomSound'
import { useKeptPosition } from '@/hooks/useKeptPosition'
import { useStoredFlag } from '@/hooks/useStoredFlag'
import {
  useStandingArtefact,
  type ListenForEncodeJobs,
} from '@/hooks/useStandingArtefact'
import type { TicketWrite } from '@/repository/tickets'
import {
  THE_ARTEFACT,
  type PlaybackSource,
} from '@/repository/playback-sources'
import { MAIN_SOUND, type SoundTrack } from '@/repository/sounds'
import {
  videoPictureHref,
  videoPlaylistHref,
  videoFrameHref,
  THE_SOUNDS_COULD_NOT_BE_READ,
  type PlaybackProfile,
} from '@/repository/video-paths'
import {
  CaptionsGlyph,
  CaptureIcon,
  FullscreenIcon,
  PauseGlyph,
  PictureInPictureIcon,
  PlayGlyph,
  SkipBackIcon,
  SkipForwardIcon,
  VolumeIcon,
} from '@/components/vela/icons'
import { Spinner } from '@/components/vela/progress'
import {
  PLAYER_BOARD,
  PLAYER_BUTTON,
  PLAYER_CHROME_OVER,
  PLAYER_CHROME_UNDER,
  PLAYER_FACE,
  PLAYER_GLYPH_BUTTON,
  PLAYER_GLYPH_BUTTON_ON,
  PLAYER_PICTURE,
  PLAYER_PICTURE_BOX,
  PLAYER_LAYER,
  PLAYER_LAYER_HANDS,
  PLAYER_SCRIM,
  PLAYER_SCRIM_TOP,
  PLAYER_SEND,
  PLAYER_SEND_MAIN,
} from '@/components/recordings/player-palette'
import {
  KEY_CAP,
  aimsAtThePlayer,
  routeKey,
  seekMarkAfter,
  SEEK_STEP_SECONDS,
  type SeekMark,
  type SeekWay,
  VOLUME_STEP_PERCENT,
} from '@/lib/player-keys'
import { PlayerTip } from '@/components/recordings/player-tip'
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
import type { GearAction } from '@/components/recordings/player-gear'
import { CAPTION_GRIP } from '@/components/recordings/player-palette'
import {
  PlayerSkip,
  PlayerSkipInTheRow,
} from '@/components/recordings/player-skip'
import {
  SAID_CAPTURED,
  SAID_NOT_CAPTURED,
  takeCapture as takeItNow,
  type TakeCapture,
} from '@/components/recordings/take-capture'
import { capturedAt, capturedName } from '@/lib/capture-name'
import { useFullscreen } from '@/hooks/useFullscreen'
import { useHeight } from '@/hooks/useHeight'
import { useWideWindow } from '@/hooks/useWideWindow'
import { usePhoneOnItsSide, usePlayerFit } from '@/hooks/usePlayerFit'
import {
  SETTLE_WHILE_THE_BAR_SIZES_THE_BOARD,
  wideRowWidth,
} from '@/lib/player-fit'
import { usePictureInPicture } from '@/hooks/usePictureInPicture'
import { airPlayCanBeHanded, recordingHandover } from '@/lib/external-player'
import { AirPlayButton } from '@/components/recordings/external-player'
import {
  askWhyItWouldNotPlay,
  faultOnTheFace,
  PlaybackFaultNotice,
  type PlaybackFault,
} from '@/components/recordings/playback-fault'
import { still } from '@/components/vela/tactile'
import { RecordingCaptions } from '@/components/recordings/recording-captions'
import { clearanceOf } from '@/components/recordings/caption-clearance'
import { useCaptionBoard } from '@/hooks/useCaptionBoard'
import { PLAIN_CAPTION_STYLE, type CaptionStyle } from '@/lib/caption-style'
import {
  readCaptions as readTheCaptions,
  type ReadCaptions,
} from '@/components/recordings/read-captions'
import {
  feedRecording as feedTheRecording,
  type FeedRecording,
} from '@/components/recordings/recording-feed'
import {
  openRecordingPlaylist,
  type OpenRecordingPlaylist,
  type RecordingPlaylistFault,
} from '@/components/recordings/recording-playlist'
import { useRecordingCarriage } from '@/hooks/useRecordingCarriage'
import { RecordingDataBroadcast } from '@/components/recordings/recording-data-broadcast'
import {
  readDataBroadcast as readTheDataBroadcast,
  readDataBroadcastModule as readTheModule,
  type ReadDataBroadcast,
  type ReadDataBroadcastModule,
} from '@/components/recordings/read-data-broadcast'
import {
  DataBroadcastBand,
  DataBroadcastFace,
  DataBroadcastRemote,
  DataBroadcastToggle,
  widestColumn,
} from '@/components/data-broadcast/data-broadcast-player'
import { RecordingRemoteColumn } from '@/components/recordings/recording-remote-column'
import {
  useSeekEvents,
  useSkipEvents,
} from '@/components/recordings/skip-events-seat'

const RESTS = 3000

const SETTLES_BEFORE_SEEK = 400

/** How often the data broadcast is told where the playhead is. */
const FOLLOWS_EVERY_MS = 250

type Phase = 'idle' | 'waiting' | 'playing' | 'paused' | 'diagnosing' | 'broken'

const WAITING_ON: Partial<Record<Phase, string>> = {
  diagnosing: '再生できませんでした — 理由の確認中',
}

/** What the picture was last asked for with; the format is settled from the choice once the browser has answered. */
interface PictureAsked {
  from: number
  profile?: PlaybackProfile
  sound?: SoundTrack
  source?: PlaybackSource
  decodes?: readonly BrowserDecoding[]
  format: FormatChoice
}

const NO_FORMAT_TO_SETTLE: FormatSettled = { settled: true, format: undefined }

export function Player({
  detail: d,
  plan: opened,
  unaskedProfile,
  profiles = [],
  formatChoice: storedFormat = 'auto',
  askBrowser,
  onTakeTicket,
  onAskForTheSound,
  onKeepPosition,
  artefact,
  onAskWhichArtefact,
  onOpenAnewWhereItStands,
  listenForEncodeJobs: listen = listenForEncodeJobs,
  startAt,
  playsAtOnce = true,
  holdsAtOnce = false,
  frameHref = videoFrameHref,
  pictureHref = videoPictureHref,
  askWhy = askWhyItWouldNotPlay,
  takeCapture = takeItNow,
  readCaptions = readTheCaptions,
  feedRecording = feedTheRecording,
  openPlaylist = openRecordingPlaylist,
  playlistHref = videoPlaylistHref,
  readDataBroadcast = readTheDataBroadcast,
  readDataBroadcastModule = readTheModule,
  autoOpensDataBroadcast = false,
  captionStyle: storedCaptionStyle = PLAIN_CAPTION_STYLE,
}: {
  detail: RecordingDetail
  plan: PlaybackPlan
  unaskedProfile?: PlaybackProfile
  /** The profiles Carina transcodes at, with the formats each is transcoded in. */
  profiles?: readonly LiveProfile[]
  /** The format this browser was left on, as its cookie says. */
  formatChoice?: FormatChoice
  /** What is asked whether a format plays here, in place of this browser. */
  askBrowser?: FormatProbe
  onTakeTicket: (id: string) => Promise<TicketWrite>
  onAskForTheSound: (
    id: string,
    sound: SoundTrack,
    source?: PlaybackSource,
    decodes?: readonly BrowserDecoding[],
  ) => Promise<PlaybackRead>
  onKeepPosition: (id: string, positionSec: number) => Promise<PositionWrite>
  artefact?: string
  onAskWhichArtefact?: (id: string) => Promise<string | undefined>
  onOpenAnewWhereItStands?: (artefact: string) => void
  listenForEncodeJobs?: ListenForEncodeJobs
  startAt?: number
  playsAtOnce?: boolean
  holdsAtOnce?: boolean
  frameHref?: (id: string, at: number) => string
  pictureHref?: (
    id: string,
    from: number,
    profile?: PlaybackProfile,
    sound?: SoundTrack,
    source?: PlaybackSource,
    decodes?: readonly BrowserDecoding[],
    format?: PlaybackFormat,
  ) => string
  askWhy?: (href: string, transcodes: boolean) => Promise<PlaybackFault>
  takeCapture?: TakeCapture
  readCaptions?: ReadCaptions
  feedRecording?: FeedRecording
  openPlaylist?: OpenRecordingPlaylist
  playlistHref?: (
    id: string,
    from: number,
    profile?: PlaybackProfile,
    sound?: SoundTrack,
  ) => string
  readDataBroadcast?: ReadDataBroadcast
  readDataBroadcastModule?: ReadDataBroadcastModule
  autoOpensDataBroadcast?: boolean
  captionStyle?: CaptionStyle
}) {
  const router = useRouter()
  const pathname = usePathname()
  const inTheAddress = useSearchParams()
  const skipEvents = useSkipEvents()
  const seekEvents = useSeekEvents()
  const video = useRef<HTMLVideoElement>(null)
  const holder = useRef<HTMLCanvasElement>(null)
  const overlay = useRef<HTMLCanvasElement>(null)
  const captions = useRef<RecordingCaptions | null>(null)
  const [captioned, setCaptioned] = useState(true)
  const captioning = opened.captions === 'ready'
  const {
    board: captionBoard,
    style: captionStyle,
    setStyle: setCaptionStyle,
    grip: captionGrip,
  } = useCaptionBoard(storedCaptionStyle)
  const [broadcastFeed] = useState(
    () =>
      new RecordingDataBroadcast(
        (signal) =>
          readDataBroadcast(d.id, opened.source, signal, opened.decodes),
        (placed, signal) => readDataBroadcastModule(d.id, placed, signal),
        d.service?.serviceId ?? 0,
        Date.parse(d.startedAt) / 1000,
      ),
  )
  const [autoOpens] = useStoredFlag(
    DATA_BROADCAST_AUTO_OPEN,
    AUTO_OPEN_SPELLING,
    autoOpensDataBroadcast,
  )
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const romSounds = useRomSound(muted ? 0 : volume)
  const broadcast = useDataBroadcast(
    broadcastFeed,
    d.id,
    { autoOpens, programme: d.startedAt },
    null,
    romSounds,
  )
  const redrawnAt = useRedrawnThumbnail(d.id)
  const [shell, setShell] = useState<HTMLElement | null>(null)
  const [chrome, setChrome] = useState<HTMLDivElement | null>(null)
  const [remoteSlot, setRemoteSlot] = useState<HTMLDivElement | null>(null)
  const wide = useWideWindow()
  const { full, filled, toggle: toggleFullscreen } = useFullscreen(shell)
  const [speed, setSpeed] = useState('1.0')
  const [profile, setProfile] = useState<PlaybackProfile | undefined>(
    unaskedProfile,
  )
  const [formatChoice, setFormatChoice] = useState(storedFormat)
  const answersOf = useFormatAnswers(
    askBrowser ?? browserProbe('managedFirst'),
    profiles,
  )
  const pictureAt = (quality: PlaybackProfile | undefined) =>
    profiles.find((one) => one.name === quality)
  const formatFor = (
    choice: FormatChoice,
    quality: PlaybackProfile | undefined,
  ): FormatSettled => {
    const picture = pictureAt(quality)

    return quality === undefined
      ? NO_FORMAT_TO_SETTLE
      : formatToPlay(choice, picture?.formats, picture && answersOf(picture))
  }
  const [plan, setPlan] = useState<PlaybackPlan>(opened)
  const [sound, setSound] = useState<SoundTrack>(MAIN_SOUND)
  const opensPlaying = startAt !== undefined && playsAtOnce
  const [waitsForAHand, setWaitsForAHand] = useState(
    opensPlaying && holdsAtOnce,
  )
  const [phase, setPhase] = useState<Phase>(opensPlaying ? 'waiting' : 'idle')
  const [fault, setFault] = useState<PlaybackFault>({ kind: 'transcode' })
  const opening = whereItStarts(opened, startAt ?? 0)
  const landing = useRef<number | null>(opensPlaying ? opening.land : null)
  const [from, setFrom] = useState(opensPlaying ? opening.from : 0)
  const fromNow = useRef(from)
  const [position, setPosition] = useState(startAt ?? 0)
  const onTheFly = plan.transcodes
  const [streamed, setStreamed] = useState(opened.transcodes)
  const carriage = useRecordingCarriage()
  const playlist = streamed && carriage === 'playlist'
  const [openings, setOpenings] = useState(0)
  const cut = useRef(false)
  const [pictureAsked, setPictureAsked] = useState<PictureAsked | undefined>(
    () =>
      opensPlaying
        ? {
            from: opening.from,
            profile: opened.transcodes ? unaskedProfile : undefined,
            sound: soundToAsk(opened.sounds, MAIN_SOUND),
            source: opened.source,
            decodes: opened.decodes,
            format: storedFormat,
          }
        : undefined,
  )
  const pictureFormat =
    pictureAsked && !playlist
      ? formatFor(pictureAsked.format, pictureAsked.profile)
      : NO_FORMAT_TO_SETTLE
  const pictureSettled = pictureFormat.settled
  const pictureFormatted = pictureFormat.settled
    ? pictureFormat.format
    : undefined
  const source = useMemo(
    () =>
      pictureAsked && pictureSettled
        ? pictureHref(
            d.id,
            pictureAsked.from,
            pictureAsked.profile,
            pictureAsked.sound,
            pictureAsked.source,
            pictureAsked.decodes,
            pictureFormatted,
          )
        : undefined,
    [d.id, pictureHref, pictureAsked, pictureSettled, pictureFormatted],
  )
  const playlistAt = useMemo(
    () =>
      pictureAsked && playlist
        ? playlistHref(
            d.id,
            pictureAsked.from,
            pictureAsked.profile,
            pictureAsked.sound,
          )
        : undefined,
    [d.id, playlistHref, pictureAsked, playlist],
  )

  const poster =
    d.thumbnailHref === undefined
      ? undefined
      : redrawnHref(d.thumbnailHref, redrawnAt)

  const [holding, setHolding] = useState(false)
  const heldNow = useRef(false)

  const [stirred, setStirred] = useState(false)
  const [onTheBar, setOnTheBar] = useState(false)
  const [scrubbingAt, setScrubbingAt] = useState<number | null>(null)
  const [bezel, setBezel] = useState<(PlayerBezel & { nth: number }) | null>(
    null,
  )
  const [flash, setFlash] = useState<SeekFlash | null>(null)
  const marked = useRef<SeekMark | null>(null)
  const [buffered, setBuffered] = useState(0)
  const [said, setSaid] = useState<PlayerSaying | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const dismissing = useRef(false)
  const tapRun = useRef<TapRun | null>(null)
  const tapWaits = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [stretchesLeftAlone, setStretchesLeftAlone] = useState<number[]>([])
  const [held, setHeld] = useState(false)
  const settling = useRef<ReturnType<typeof setTimeout> | null>(null)

  const wanted = useRef<number | null>(null)
  const asking = useRef<ReturnType<typeof setTimeout> | null>(null)
  const asked = useRef(0)
  const pending = useRef<SoundTrack | null>(null)
  const [pendingSound, setPendingSound] = useState<SoundTrack | null>(null)
  const shownUnder = useRef<PlaybackPlan | null>(opensPlaying ? opened : null)

  const attempt = useRef(0)
  const openedOn = useRef(artefact)
  const replanned = useRef(0)

  const asItStands = useRef({ position, profile, plan, sound })

  const standsAs = (now: Partial<typeof asItStands.current>) => {
    asItStands.current = { ...asItStands.current, ...now }
  }

  useKeptPosition(
    phase === 'playing',
    () => position,
    (at) => {
      void onKeepPosition(d.id, at)
        .then((kept) => {
          if (kept.state !== 'ok') {
            console.warn('[player] the position reached was not kept', d.id)
          }
        })
        .catch((error) => {
          console.warn(
            '[player] the position reached was not sent',
            d.id,
            error,
          )
        })
    },
  )

  const pip = usePictureInPicture(video)
  const duration = d.lengthSec ?? 0
  const drops = d.qualitySpots?.map((spot) => spot.second)
  const chapters = chaptersToDraw(plan.chapters)
  const nextChapterAt = nextBoundaryAfter(position, chapters)
  const runHere = skippableRunAt(position, chapters)
  const framed = phase === 'playing' || phase === 'paused'
  const chromeUp =
    phase !== 'playing' ||
    stirred ||
    onTheBar ||
    held ||
    scrubbingAt !== null ||
    settingsOpen ||
    pip.out

  const capture = async () => {
    const got = await takeCapture({
      video: video.current,
      name: capturedName(d.title, capturedAt(position)),
      over: (context, size) => captions.current?.drawOn(context, size),
    })

    broadcast.quiet()
    setSaid(
      got === 'saved'
        ? { text: SAID_CAPTURED, tone: 'ok' }
        : { text: SAID_NOT_CAPTURED, tone: 'err' },
    )
  }

  useEffect(() => {
    shell?.focus({ preventScroll: true })
  }, [shell])

  useEffect(
    () => () => {
      if (settling.current) {
        clearTimeout(settling.current)
      }

      if (asking.current) {
        clearTimeout(asking.current)
      }

      if (tapWaits.current) {
        clearTimeout(tapWaits.current)
      }
    },
    [],
  )

  useEffect(() => {
    const element = video.current

    if (!element || source === undefined) {
      return
    }

    const land = () => {
      if (landing.current === null) {
        return
      }

      element.currentTime = landing.current
      landing.current = null
    }

    if (element.readyState >= element.HAVE_METADATA) {
      land()

      return
    }

    element.addEventListener('loadedmetadata', land)

    return () => element.removeEventListener('loadedmetadata', land)
  }, [source])

  const faceUp = phase !== 'broken'

  /** The second of the source on screen, or null while a frame is held, a seek is landing or nothing is decoded yet. */
  const seenAt = () => {
    const element = video.current

    if (
      !element ||
      heldNow.current ||
      element.seeking ||
      element.readyState < element.HAVE_CURRENT_DATA ||
      theLandingIsStillAhead(landing.current, element.currentTime)
    ) {
      return null
    }

    return fromNow.current + element.currentTime
  }

  useEffect(() => {
    broadcastFeed.start()

    const following = setInterval(() => {
      const second = seenAt()

      if (second !== null) {
        broadcastFeed.advance(second)
      }
    }, FOLLOWS_EVERY_MS)

    return () => {
      clearInterval(following)
      broadcastFeed.close()
    }
  }, [broadcastFeed])

  useEffect(() => {
    const element = video.current
    const plate = overlay.current

    if (!captioning || !faceUp || !element || !plate) {
      return
    }

    const layer = new RecordingCaptions(
      plate,
      element,
      seenAt,
      (at, signal) =>
        readCaptions(d.id, at, opened.source, signal, opened.decodes),
      captionBoard,
    )

    captions.current = layer

    return () => {
      layer.close()
      captions.current = null
    }
  }, [
    captioning,
    faceUp,
    d.id,
    opened.source,
    opened.decodes,
    readCaptions,
    captionBoard,
  ])

  const aimed = useRef(false)

  const stir = () => {
    if (settling.current) {
      clearTimeout(settling.current)
    }

    setStirred(true)
    settling.current = setTimeout(() => setStirred(false), RESTS)
  }

  const hold = () => {
    const element = video.current
    const plate = holder.current

    if (
      !element ||
      !plate ||
      element.readyState < element.HAVE_CURRENT_DATA ||
      element.videoWidth === 0
    ) {
      return
    }

    plate.width = element.videoWidth
    plate.height = element.videoHeight
    plate.getContext('2d')?.drawImage(element, 0, 0)
    heldNow.current = true
    setHolding(true)
  }

  const nowAsking = (next: SoundTrack | null) => {
    pending.current = next
    setPendingSound(next)
  }

  const play = (
    second: number,
    quality: PlaybackProfile | undefined = profile,
    carrying: SoundTrack = sound,
    under: PlaybackPlan = plan,
    choosing: FormatChoice = formatChoice,
  ) => {
    if (asking.current) {
      clearTimeout(asking.current)
      asking.current = null
    }

    const starts = whereItStarts(under, second)

    hold()
    setWaitsForAHand(false)
    cut.current = false
    wanted.current = null
    attempt.current += 1
    asked.current += 1
    landing.current = starts.land
    shownUnder.current = under
    nowAsking(null)
    fromNow.current = starts.from
    setFrom(starts.from)
    setPosition(second)
    setProfile(quality)
    setSound(carrying)
    standsAs({ position: second, profile: quality, sound: carrying })
    setPhase('waiting')
    setStreamed(under.transcodes)
    setOpenings((were) => were + 1)
    setPictureAsked({
      from: starts.from,
      profile: under.transcodes ? quality : undefined,
      sound: soundToAsk(under.sounds, carrying),
      source: under.source,
      decodes: under.decodes,
      format: choosing,
    })
  }

  const breaks = (fault: PlaybackFault) => {
    attempt.current += 1
    setFault(faultOnTheFace(d) ?? fault)
    setPhase('broken')
  }

  const stumbled = () => {
    const mine = (attempt.current += 1)
    const onTheFace = faultOnTheFace(d)

    if (onTheFace || !source) {
      setFault(onTheFace ?? { kind: 'transcode' })
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

  const noteBuffered = (ranges: TimeRanges) =>
    setBuffered(ranges.length > 0 ? from + ranges.end(ranges.length - 1) : 0)

  const feedFaulted = useEffectEvent(() => stumbled())

  const feedCut = useEffectEvent(() => {
    if (video.current?.paused ?? true) {
      cut.current = true

      return
    }

    play(asItStands.current.position)
  })

  const feedBuffered = useEffectEvent(() => {
    if (video.current) {
      noteBuffered(video.current.buffered)
    }
  })

  const playlistFaulted = useEffectEvent((fault: RecordingPlaylistFault) =>
    breaks({
      kind: fault === 'unplayable' ? 'theBrowserWouldNotPlay' : 'transcode',
    }),
  )

  useEffect(() => {
    const element = video.current

    if (
      !element ||
      source === undefined ||
      !streamed ||
      !faceUp ||
      carriage === undefined
    ) {
      return
    }

    if (carriage === 'none') {
      const saying = setTimeout(() => playlistFaulted('unplayable'), 0)

      return () => clearTimeout(saying)
    }

    if (carriage === 'playlist') {
      if (playlistAt === undefined) {
        return
      }

      const played = openPlaylist(element, playlistAt, {
        onFault: (fault) => playlistFaulted(fault),
        onCut: () => feedCut(),
      })

      return () => played.close()
    }

    const carrying = feedRecording(element, source, {
      onFault: () => feedFaulted(),
      onCut: () => feedCut(),
      onBuffered: () => feedBuffered(),
    })

    return () => carrying.close()
  }, [
    source,
    streamed,
    faceUp,
    carriage,
    playlistAt,
    feedRecording,
    openPlaylist,
    openings,
  ])

  const answer = (what: PlayerBezel) =>
    setBezel((last) => ({ ...what, nth: (last?.nth ?? 0) + 1 }))

  const answerSeek = (way: SeekWay, at: number) => {
    const mark = seekMarkAfter(marked.current, way, at)

    marked.current = mark
    setFlash((last) => ({
      way,
      seconds: mark.seconds,
      nth: (last?.nth ?? 0) + 1,
    }))
  }

  const toggle = () => {
    const element = video.current

    broadcast.unlockSounds()

    if (
      phase === 'idle' ||
      phase === 'broken' ||
      !element ||
      !source ||
      cut.current
    ) {
      answer({ was: 'play' })
      play(position)

      return
    }

    if (streamed && element.ended) {
      answer({ was: 'play' })
      play(0)

      return
    }

    if (element.paused) {
      answer({ was: 'play' })
      setWaitsForAHand(false)
      void element.play().catch(() => setPhase('paused'))

      return
    }

    answer({ was: 'pause' })
    element.pause()
  }

  const choose = (second: number, means?: SeekMeans) => {
    const at = Math.min(duration, Math.max(0, second))
    const from = wanted.current ?? position

    skipEvents?.sought(from, at)
    seekEvents?.sought(from, at, means)
    wanted.current = at
    setPosition(at)
    standsAs({ position: at })

    if (plan.seeking === 'byRange' && video.current && source) {
      landing.current = null
      video.current.currentTime = at

      return
    }

    if (asking.current) {
      clearTimeout(asking.current)
    }

    asking.current = setTimeout(() => play(at), SETTLES_BEFORE_SEEK)
  }

  const step = (by: number, at: number, means: SeekMeans = 'step') => {
    answerSeek(by < 0 ? 'back' : 'forward', at)
    choose((wanted.current ?? position) + by, means)
  }

  const zoneOf = (event: MouseEvent<HTMLElement>): TapZone => {
    if (duration <= 0) {
      return 'middle'
    }

    const box = event.currentTarget.getBoundingClientRect()

    return tapZone(event.clientX - box.left, box.width)
  }

  const tap = (zone: TapZone, at: number) => {
    if (tapWaits.current) {
      clearTimeout(tapWaits.current)
      tapWaits.current = null
    }

    const said = whatTheTapDoes(tapRun.current, zone, at)

    tapRun.current = said.run

    if (said.answer === 'toggle') {
      toggle()

      return
    }

    if (said.answer === 'wait') {
      tapWaits.current = setTimeout(() => {
        tapWaits.current = null
        tapRun.current = null
        toggle()
      }, SECOND_TAP_WITHIN)

      return
    }

    step(said.answer === 'back' ? -SEEK_STEP_SECONDS : SEEK_STEP_SECONDS, at)
  }

  const skipTheRun = (to: number) => {
    const from = position

    shell?.focus({ preventScroll: true })
    choose(to)

    if (runHere) {
      skipEvents?.skippedTheRun(from, runHere.chapters)
    }
  }

  const leaveTheStretch = () => {
    shell?.focus({ preventScroll: true })

    if (runHere) {
      const [playing] = runHere.chapters

      setStretchesLeftAlone((were) => [...were, playing.endsAtSec])
      skipEvents?.leftTheStretch(position, playing)
    }
  }

  useEffect(() => {
    skipEvents?.runsBehindBy(plan.recordingOffsetSec)
    seekEvents?.runsBehindBy(plan.recordingOffsetSec)
  }, [skipEvents, seekEvents, plan.recordingOffsetSec])

  useEffect(() => {
    skipEvents?.tell(position)
    seekEvents?.tell(position)
  }, [skipEvents, seekEvents, position])

  useEffect(() => {
    seekEvents?.runsAt(Number(speed))
  }, [seekEvents, speed])

  const offered =
    runHere !== undefined &&
    !stretchesLeftAlone.includes(runHere.chapters[0].endsAtSec) &&
    (phase === 'playing' || phase === 'paused' || phase === 'waiting') &&
    !pip.out
      ? runHere
      : undefined

  const chooseProfile = (next: string) => {
    const quality = next as PlaybackProfile

    if (phase === 'idle') {
      setProfile(quality)
      standsAs({ profile: quality })

      return
    }

    play(position, quality)
  }

  const chooseFormat = (next: FormatChoice) => {
    storeText(FORMAT_COOKIE, next)
    setFormatChoice(next)

    if (phase === 'idle' || !onTheFly) {
      return
    }

    const becomes = formatFor(next, profile)

    if (
      pictureFormat.settled &&
      becomes.settled &&
      pictureFormat.format === becomes.format
    ) {
      return
    }

    play(position, profile, sound, plan, next)
  }

  const gearPicture = pictureAt(profile)
  const formatsToChoose = formatChoices(
    gearPicture?.formats,
    gearPicture && answersOf(gearPicture),
  )

  const chooseSound = (next: SoundTrack) => {
    if (next === pending.current) {
      return
    }

    if (next === sound) {
      if (pending.current !== null) {
        asked.current += 1
        nowAsking(null)
      }

      return
    }

    const mine = (asked.current += 1)

    nowAsking(next)

    void onAskForTheSound(d.id, next, plan.source, plan.decodes)
      .then((answer) => {
        if (asked.current !== mine) {
          return
        }

        nowAsking(null)

        const under = shownUnder.current
        const standing = asItStands.current
        const became = whatTheSoundBecomes(standing.plan, next, answer)

        setPlan(became.plan)
        standsAs({ plan: became.plan })
        setSaid((was) => whatIsStillSaid(was, became.said))

        if (
          !under ||
          (became.sound === standing.sound &&
            became.plan.route === under.route &&
            became.plan.seeking === under.seeking)
        ) {
          setSound(became.sound)
          standsAs({ sound: became.sound })

          return
        }

        play(standing.position, standing.profile, became.sound, became.plan)
      })
      .catch(() => {
        if (asked.current !== mine) {
          return
        }

        nowAsking(null)
        setSaid({ text: THE_SOUNDS_COULD_NOT_BE_READ, tone: 'err' })
      })
  }

  const standsStill = () => phase === 'paused' || waitsForAHand

  const openAgain = (next: PlaybackSource, at: number | undefined) => {
    router.replace(
      whereThatSourceOpens(
        pathname,
        inTheAddress.toString(),
        next,
        at,
        standsStill(),
      ) as Route,
      { scroll: false },
    )
  }

  const chooseSource = (next: PlaybackSource) => {
    if (next === plan.source) {
      return
    }

    openAgain(next, phase === 'idle' ? undefined : position)
  }

  useStandingArtefact(
    onAskWhichArtefact !== undefined && plan.source === THE_ARTEFACT,
    listen,
    () => onAskWhichArtefact?.(d.id) ?? Promise.resolve(undefined),
    (standing) => {
      const asks = whatTheStandingArtefactAsks(
        openedOn.current,
        standing,
        plan.source,
        phase !== 'idle',
      )

      if (asks === 'stay') {
        return
      }

      if (asks === 'learn') {
        openedOn.current = standing

        return
      }

      if (asks === 'reopen') {
        openedOn.current = standing

        if (
          standing !== undefined &&
          theAddressStands(
            pathname,
            inTheAddress.toString(),
            THE_ARTEFACT,
            asItStands.current.position,
            standsStill(),
          )
        ) {
          onOpenAnewWhereItStands?.(standing)

          return
        }

        openAgain(THE_ARTEFACT, asItStands.current.position)

        return
      }

      const mine = (replanned.current += 1)

      void onAskForTheSound(
        d.id,
        asItStands.current.sound,
        plan.source,
        plan.decodes,
      )
        .then((answer) => {
          if (replanned.current !== mine || answer.state !== 'planned') {
            return
          }

          openedOn.current = standing
          setPlan(answer.plan)
          standsAs({ plan: answer.plan })
        })
        .catch((error) => {
          console.warn('[player] the new artefact was not planned', d.id, error)
        })
    },
  )

  const chooseSpeed = (next: string) => {
    setSpeed(next)

    if (video.current) {
      video.current.playbackRate = Number(next)
    }
  }

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

  const aimAtTheKeypad = () => {
    aimed.current = true
    shell?.focus({ preventScroll: true })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const route = routeKey(
      event,
      {
        seeks: duration > 0,
        captions: captioning,
        dataBroadcast: broadcast.offered,
        aimed: aimed.current,
      },
      broadcast.view.open ? { usedKeys: broadcast.view.usedKeys } : null,
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
      case 'back':
        step(-SEEK_STEP_SECONDS, event.timeStamp, 'key')
        break
      case 'forward':
        step(SEEK_STEP_SECONDS, event.timeStamp, 'key')
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
    }
  }

  const faceShown = broadcast.view.open
  const fit = usePlayerFit(
    shell,
    wideRowWidth({
      glyphs:
        (duration > 0 ? 3 : 1) +
        4 +
        Number(airPlayCanBeHanded(plan)) +
        Number(captioning) +
        Number(broadcast.offered) +
        Number(pip.offered),
      time: true,
      chapters: chapters.length > 0,
    }),
    faceShown && bandPlace(full, wide) !== 'over'
      ? SETTLE_WHILE_THE_BAR_SIZES_THE_BOARD
      : 0,
  )
  const sideways = usePhoneOnItsSide()
  const roomy = fit === 'wide'
  const place = bandPlace(full, wide)
  const underTheBox = faceShown && place !== 'over'
  const compact = fit === 'compact' && !underTheBox
  const skipInTheRow =
    offered !== undefined && compact && chromeUp && !underTheBox
  const bandUnderTheBox = faceShown && place === 'under'
  const rowHeight = useHeight(underTheBox ? chrome : null)
  const clearsTheRow =
    captioning && chromeUp && !underTheBox && !broadcast.view.rect && !pip.out
  const clearance = useMemo(
    () => (clearsTheRow ? () => clearanceOf(chrome, shell) : null),
    [clearsTheRow, chrome, shell],
  )

  useEffect(() => captionBoard.clearOf(clearance), [captionBoard, clearance])

  const overThePicture = faceShown && place === 'over'
  const beside = faceShown && place === 'column'
  const widest = widestColumn(place, underTheBox, rowHeight)
  const barSaid: PlayerSaying | null = broadcast.view.failed
    ? { text: SAID_FAILED, tone: 'err' }
    : said

  const chromeHands = {
    onPointerEnter: () => setOnTheBar(true),
    onPointerLeave: () => setOnTheBar(false),
    onFocus: (event: FocusEvent) => {
      const reached =
        event.target instanceof Element &&
        event.target.matches(':focus-visible')

      setHeld(reached)

      if (reached) {
        aimed.current = true
      }
    },
    onBlur: () => setHeld(false),
  }
  const waitingSaid = phase === 'waiting' || phase === 'diagnosing'
  const seekBar = duration > 0 && (
    <PlayerSeek
      id={d.id}
      duration={duration}
      position={position}
      buffered={buffered}
      drops={drops}
      chapters={chapters}
      onChoose={choose}
      onScrubbing={setScrubbingAt}
      frameHref={frameHref}
      touch={compact}
    />
  )
  const playButton = (look: string) => (
    <PlayerTip
      name={phase === 'playing' ? '一時停止' : '再生'}
      keys={[KEY_CAP.toggle]}
      container={shell}
    >
      <button
        type="button"
        aria-label={phase === 'playing' ? '一時停止' : '再生'}
        onClick={toggle}
        className={look}
      >
        {phase === 'playing' ? <PauseGlyph /> : <PlayGlyph />}
      </button>
    </PlayerTip>
  )
  const backButton = (look: string) => (
    <PlayerTip
      name={`${SEEK_STEP_SECONDS} 秒戻る`}
      keys={[KEY_CAP.back]}
      container={shell}
    >
      <button
        type="button"
        aria-label={`${SEEK_STEP_SECONDS} 秒戻る`}
        onClick={(event) => step(-SEEK_STEP_SECONDS, event.timeStamp)}
        className={look}
      >
        <SkipBackIcon seconds={SEEK_STEP_SECONDS} />
      </button>
    </PlayerTip>
  )
  const forwardButton = (look: string) => (
    <PlayerTip
      name={`${SEEK_STEP_SECONDS} 秒進む`}
      keys={[KEY_CAP.forward]}
      container={shell}
    >
      <button
        type="button"
        aria-label={`${SEEK_STEP_SECONDS} 秒進む`}
        onClick={(event) => step(SEEK_STEP_SECONDS, event.timeStamp)}
        className={look}
      >
        <SkipForwardIcon seconds={SEEK_STEP_SECONDS} />
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
  const airPlayButton = airPlayCanBeHanded(plan) && (
    <PlayerTip name="AirPlay" container={shell}>
      <AirPlayButton
        handover={recordingHandover(d.id, onTakeTicket)}
        video={video}
        onRefused={(message) => setSaid({ text: message, tone: 'err' })}
      />
    </PlayerTip>
  )
  const captionsButton = captioning && (
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
  const broadcastButton = broadcast.offered && (
    <DataBroadcastToggle
      open={broadcast.view.open}
      onToggle={toggleBroadcast}
      container={shell}
    />
  )
  const rareActions: GearAction[] = [
    {
      name: 'キャプチャ',
      icon: <CaptureIcon />,
      disabled: !framed,
      onPress: capture,
    },
    ...(pip.offered
      ? [
          {
            name: 'ピクチャーインピクチャー',
            icon: <PictureInPictureIcon />,
            disabled: !framed,
            pressed: pip.out,
            onPress: pip.toggle,
          },
        ]
      : []),
  ]
  const gearButton = (
    <PlayerTip name="設定" container={shell} quiet={settingsOpen}>
      <PlayerSettings
        container={shell}
        sheet={fit === 'compact' || sideways}
        full={full}
        actions={roomy ? [] : rareActions}
        onOpenChange={setSettingsOpen}
        profile={profile}
        onChooseProfile={chooseProfile}
        format={
          playlist
            ? undefined
            : {
                choices: formatsToChoose,
                chosen: choiceShown(formatChoice, formatsToChoose),
                onChoose: chooseFormat,
              }
        }
        onTheFly={onTheFly}
        speed={speed}
        onChooseSpeed={chooseSpeed}
        sounds={plan.sounds}
        sound={pendingSound ?? sound}
        onChooseSound={chooseSound}
        source={plan.source}
        alternative={plan.alternative}
        onChooseSource={chooseSource}
        captionStyle={captioning ? captionStyle : undefined}
        onCaptionStyle={setCaptionStyle}
      />
    </PlayerTip>
  )
  const captureButton = (
    <PlayerTip name="キャプチャ" container={shell}>
      <button
        type="button"
        aria-label="キャプチャ"
        disabled={!framed}
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
        disabled={!framed}
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

  if (phase === 'broken') {
    return (
      <PlaybackFaultNotice
        detail={d}
        plan={plan}
        fault={fault}
        onRetry={() => play(position)}
        onTakeTicket={onTakeTicket}
      />
    )
  }

  return (
    <div
      data-slot="player-row"
      data-remote={beside ? 'beside' : undefined}
      className="flex items-start justify-center"
    >
      <section
        ref={setShell}
        data-full={full ? 'true' : undefined}
        data-fill={filled ? 'true' : undefined}
        tabIndex={-1}
        data-slot="player"
        onPointerMove={stir}
        onPointerLeave={stir}
        onPointerDown={() => {
          aimed.current = true
        }}
        onKeyDown={onKeyDown}
        data-up={chromeUp ? 'true' : undefined}
        style={{ maxWidth: widest, width: beside ? widest : undefined }}
        className={cn(PLAYER_BOARD, 'min-w-0', beside && 'mx-0')}
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
                faceShown
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
                  src={streamed ? undefined : source}
                  autoPlay={source !== undefined && !waitsForAHand}
                  poster={poster}
                  preload={waitsForAHand ? 'auto' : 'none'}
                  playsInline
                  onLoadedMetadata={(event) => {
                    event.currentTarget.playbackRate = Number(speed)
                    event.currentTarget.volume = volume
                    event.currentTarget.muted = muted
                  }}
                  onSeeked={() => {
                    landing.current = null
                  }}
                  onLoadedData={() =>
                    setPhase((was) =>
                      was === 'waiting' && !holding ? 'paused' : was,
                    )
                  }
                  onPlaying={() => {
                    heldNow.current = false
                    setHolding(false)
                    setPhase('playing')
                    stir()
                  }}
                  onWaiting={() => setPhase('waiting')}
                  onPause={() =>
                    setPhase((was) => (was === 'waiting' ? was : 'paused'))
                  }
                  onEnded={() => setPhase('paused')}
                  onError={playlist ? undefined : stumbled}
                  onProgress={(event) =>
                    noteBuffered(event.currentTarget.buffered)
                  }
                  onTimeUpdate={(event) => {
                    if (asking.current) {
                      return
                    }

                    const at = event.currentTarget.currentTime

                    if (theLandingIsStillAhead(landing.current, at)) {
                      return
                    }

                    landing.current = null
                    wanted.current = null
                    setPosition(from + at)
                    standsAs({ position: from + at })
                  }}
                  className={cn(PLAYER_PICTURE, '[[data-full]_&]:max-w-none')}
                />
                <canvas
                  ref={holder}
                  aria-hidden="true"
                  data-slot="player-held-frame"
                  data-holding={holding ? 'true' : undefined}
                  className={cn(
                    'pointer-events-none absolute inset-0 hidden data-[holding]:block',
                    PLAYER_PICTURE,
                    '[[data-full]_&]:max-w-none',
                  )}
                />
                {captioning && (
                  <canvas
                    ref={overlay}
                    aria-hidden="true"
                    data-slot="player-captions"
                    data-drawn={captioned && !pip.out ? 'yes' : 'no'}
                    className="pointer-events-none absolute inset-0 size-full"
                  />
                )}
              </div>
              {faceShown && (
                <DataBroadcastFace
                  feed={broadcastFeed}
                  onAir={{
                    network: d.service?.networkId ?? null,
                    startsAt: Date.parse(d.startedAt) / 1000,
                  }}
                  onRuntime={broadcast.connect}
                  onMessage={hearBroadcast}
                  says={dataBroadcastSays(broadcast.view)}
                />
              )}
            </div>
          </div>
          {!pip.out && (
            <div
              data-slot="player-press"
              onMouseDown={(event) => {
                event.preventDefault()
                dismissing.current = settingsOpen
                shell?.focus({ preventScroll: true })
              }}
              onClick={(event) => {
                if (dismissing.current) {
                  dismissing.current = false

                  return
                }

                tap(zoneOf(event), event.timeStamp)
              }}
              onDoubleClick={(event) => {
                if (zoneOf(event) === 'middle') {
                  toggleFullscreen()
                }
              }}
              data-up={chromeUp ? 'true' : undefined}
              className="absolute inset-0 cursor-none touch-manipulation select-none data-[up]:cursor-pointer"
            >
              {captioning && !faceShown && (
                <div
                  ref={captionGrip}
                  aria-hidden="true"
                  data-slot="player-caption-grip"
                  className={CAPTION_GRIP}
                />
              )}
            </div>
          )}
          <PlayerCenter
            standing={
              !compact && !pip.out && (phase === 'idle' || phase === 'paused')
                ? 'play'
                : undefined
            }
            onStanding={() => {
              shell?.focus({ preventScroll: true })
              toggle()
            }}
            bezel={bezel ?? undefined}
          />
          <PlayerSeekFlash flash={flash ?? undefined} />
          {offered && !skipInTheRow && (
            <PlayerSkip
              key={offered.chapters[0].endsAtSec}
              kinds={offered.kinds}
              to={offered.endsAtSec}
              raised={chromeUp && !underTheBox}
              onSkip={skipTheRun}
              onDismiss={leaveTheStretch}
              container={shell}
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
          {!pip.out && waitingSaid && (
            <p
              role="status"
              className="pointer-events-none absolute inset-0 m-auto flex h-fit w-fit max-w-[88%] items-center justify-center gap-2 rounded-full border border-white/25 bg-black/80 px-4 py-2 text-center text-ui font-medium text-(--pl-ink)"
            >
              <Spinner className="text-(--pl-accent)" />
              {WAITING_ON[phase]}
            </p>
          )}
        </div>
        {compact && (
          <div
            data-slot="player-top"
            data-up={chromeUp ? 'true' : undefined}
            {...chromeHands}
            style={{ backgroundImage: PLAYER_SCRIM_TOP }}
            className={cn(
              PLAYER_LAYER,
              'inset-x-0 top-0 flex justify-end gap-x-1 px-2 pt-1.5 pb-6',
              '[[data-fill]_&]:top-[env(safe-area-inset-top)] [[data-fill]_&]:right-[env(safe-area-inset-right)]',
            )}
          >
            <div
              className={cn('flex items-center gap-x-1', PLAYER_LAYER_HANDS)}
            >
              {airPlayButton}
              {muteButton}
              {captionsButton}
              {broadcastButton}
              {gearButton}
            </div>
          </div>
        )}
        {compact && !pip.out && !waitingSaid && (
          <div
            data-slot="player-sends"
            data-up={chromeUp ? 'true' : undefined}
            {...chromeHands}
            className={cn(
              PLAYER_LAYER,
              'inset-x-0 top-[calc(50%-15rem/16)] flex -translate-y-1/2 items-center justify-center gap-x-6',
            )}
          >
            {duration > 0 && backButton(PLAYER_SEND)}
            {playButton(PLAYER_SEND_MAIN)}
            {duration > 0 && forwardButton(PLAYER_SEND)}
          </div>
        )}
        <div
          ref={setChrome}
          data-slot="player-chrome"
          data-fit={fit}
          data-up={chromeUp ? 'true' : undefined}
          {...chromeHands}
          style={{
            backgroundImage: faceShown ? 'none' : PLAYER_SCRIM,
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
            />
          )}
          <div
            data-slot="player-controls"
            className={cn(
              'px-4 max-[700px]:px-3',
              compact ? 'pb-0.5' : 'pb-3',
              faceShown ? 'pt-3' : compact ? 'pt-8' : 'pt-14',
            )}
          >
            {!compact && seekBar}
            {barSaid && (
              <p
                role="status"
                className={cn(
                  'mt-2 text-cap font-medium',
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
                compact && PLAYER_LAYER_HANDS,
                'flex flex-wrap items-center gap-x-1 gap-y-2',
                !compact && 'mt-5',
              )}
            >
              {!compact && (
                <>
                  {playButton(PLAYER_GLYPH_BUTTON)}
                  {duration > 0 && (
                    <>
                      {backButton(PLAYER_GLYPH_BUTTON)}
                      {forwardButton(PLAYER_GLYPH_BUTTON)}
                    </>
                  )}
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
              <span
                className={cn(
                  'font-code text-[calc(13rem/16)] font-medium whitespace-nowrap text-(--pl-ink) tabular-nums',
                  compact ? 'ml-1' : 'ml-2',
                )}
              >
                {formatPlayerTime(scrubbingAt ?? position)} /{' '}
                {formatPlayerTime(duration)}
              </span>
              {chapters.length > 0 && !skipInTheRow && (
                <button
                  type="button"
                  disabled={nextChapterAt === undefined}
                  onClick={() =>
                    nextChapterAt !== undefined &&
                    choose(nextChapterAt, 'chapter')
                  }
                  className={cn(PLAYER_BUTTON, 'ml-2')}
                >
                  次のチャプターへ
                </button>
              )}
              {skipInTheRow && (
                <PlayerSkipInTheRow
                  key={offered.chapters[0].endsAtSec}
                  kinds={offered.kinds}
                  to={offered.endsAtSec}
                  onSkip={skipTheRun}
                  onDismiss={leaveTheStretch}
                  container={shell}
                />
              )}
              <div
                className={cn(
                  'flex flex-wrap items-center gap-x-1 gap-y-2',
                  !skipInTheRow && 'ml-auto',
                  !compact && 'max-[700px]:ml-0',
                )}
              >
                {!compact && (
                  <>
                    {airPlayButton}
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
            {compact && seekBar && (
              <div className={cn('mt-4', PLAYER_LAYER_HANDS)}>{seekBar}</div>
            )}
          </div>
        </div>
        {bandUnderTheBox && (
          <DataBroadcastBand
            place="under"
            numbers={broadcast.view.numbers}
            onNumbers={broadcast.showNumbers}
            onKey={broadcast.press}
            onAim={aimAtTheKeypad}
          />
        )}
        {beside &&
          remoteSlot &&
          createPortal(
            <DataBroadcastRemote
              station={d.channel}
              onKey={broadcast.press}
              onAim={aimAtTheKeypad}
              onToggle={toggleBroadcast}
            />,
            remoteSlot,
          )}
      </section>
      {faceShown && wide && <RecordingRemoteColumn slotRef={setRemoteSlot} />}
    </div>
  )
}
