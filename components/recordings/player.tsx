'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

import { cn } from '@/lib/utils'
import { formatPlayerTime } from '@/lib/format'
import { redrawnHref } from '@/lib/thumbnail-redraw'
import { useRedrawnThumbnail } from '@/hooks/useRedrawnThumbnail'
import type { RecordingDetail } from '@/repository/recordings'
import type { PlaybackPlan, TicketWrite } from '@/repository/videos'
import { MAIN_SOUND, type SoundTrack } from '@/repository/sounds'
import {
  videoPictureHref,
  videoFrameHref,
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
  PLAYER_CHROME_FADE,
  PLAYER_FACE,
  PLAYER_GLYPH_BUTTON,
  PLAYER_GLYPH_BUTTON_ON,
  PLAYER_PALETTE,
  PLAYER_PICTURE,
  PLAYER_SCRIM,
} from '@/components/recordings/player-palette'
import {
  KEY_CAP,
  playerCommand,
  SEEK_FLASH_LASTS,
  SEEK_STEP_SECONDS,
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
import {
  SAID_CAPTURED,
  SAID_NOT_CAPTURED,
  takeCapture as takeItNow,
  type TakeCapture,
} from '@/components/recordings/take-capture'
import { capturedAt, capturedName } from '@/lib/capture-name'
import { usePictureInPicture } from '@/hooks/usePictureInPicture'
import { AirPlayButton } from '@/components/recordings/external-player'
import {
  askWhyItWouldNotPlay,
  faultOnTheFace,
  PlaybackFaultNotice,
  type PlaybackFault,
} from '@/components/recordings/playback-fault'
import { still } from '@/components/vela/tactile'

const RESTS = 3000

const SETTLES_BEFORE_SEEK = 400

type Phase = 'idle' | 'waiting' | 'playing' | 'paused' | 'diagnosing' | 'broken'

const WAITING_ON: Partial<Record<Phase, string>> = {
  diagnosing: '再生できませんでした — 理由の確認中',
}

export function Player({
  detail: d,
  plan,
  unaskedProfile,
  onTakeTicket,
  startAt,
  frameHref = videoFrameHref,
  pictureHref = videoPictureHref,
  askWhy = askWhyItWouldNotPlay,
  takeCapture = takeItNow,
}: {
  detail: RecordingDetail
  plan: PlaybackPlan
  unaskedProfile?: PlaybackProfile
  onTakeTicket: (id: string) => Promise<TicketWrite>
  startAt?: number
  frameHref?: (id: string, at: number) => string
  pictureHref?: (
    id: string,
    from: number,
    profile?: PlaybackProfile,
    sound?: SoundTrack,
  ) => string
  askWhy?: (href: string, transcodes: boolean) => Promise<PlaybackFault>
  takeCapture?: TakeCapture
}) {
  const video = useRef<HTMLVideoElement>(null)
  const holder = useRef<HTMLCanvasElement>(null)
  const redrawnAt = useRedrawnThumbnail(d.id)
  const [shell, setShell] = useState<HTMLElement | null>(null)
  const [speed, setSpeed] = useState('1.0')
  const [profile, setProfile] = useState<PlaybackProfile | undefined>(
    unaskedProfile,
  )
  const [sound, setSound] = useState<SoundTrack>(MAIN_SOUND)
  const [phase, setPhase] = useState<Phase>(
    startAt === undefined ? 'idle' : 'waiting',
  )
  const [fault, setFault] = useState<PlaybackFault>({ kind: 'transcode' })
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
          onTheFly ? unaskedProfile : undefined,
          onTheFly ? MAIN_SOUND : undefined,
        ),
  )

  const poster =
    d.thumbnailHref === undefined
      ? undefined
      : redrawnHref(d.thumbnailHref, redrawnAt)

  const [holding, setHolding] = useState(false)

  const [stirred, setStirred] = useState(false)
  const [onTheBar, setOnTheBar] = useState(false)
  const [scrubbingAt, setScrubbingAt] = useState<number | null>(null)
  const [bezel, setBezel] = useState<(PlayerBezel & { nth: number }) | null>(
    null,
  )
  const [flash, setFlash] = useState<SeekFlash | null>(null)
  const flashedAt = useRef(0)
  const [buffered, setBuffered] = useState(0)
  const [said, setSaid] = useState<{
    text: string
    tone: 'ok' | 'err'
  } | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const dismissing = useRef(false)
  const [held, setHeld] = useState(false)
  const settling = useRef<ReturnType<typeof setTimeout> | null>(null)

  const wanted = useRef<number | null>(null)
  const asking = useRef<ReturnType<typeof setTimeout> | null>(null)

  const attempt = useRef(0)

  const pip = usePictureInPicture(video)
  const duration = d.lengthSec ?? 0
  const drops = d.qualitySpots?.map((spot) => spot.second)
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
    })

    setSaid(
      got === 'saved'
        ? { text: SAID_CAPTURED, tone: 'ok' }
        : { text: SAID_NOT_CAPTURED, tone: 'err' },
    )
  }

  useEffect(() => {
    const read = () => setFull(document.fullscreenElement === shell)

    document.addEventListener('fullscreenchange', read)

    return () => document.removeEventListener('fullscreenchange', read)
  }, [shell])

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
    },
    [],
  )

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
    setHolding(true)
  }

  const play = (
    second: number,
    asked: PlaybackProfile | undefined = profile,
    carrying: SoundTrack = sound,
  ) => {
    if (asking.current) {
      clearTimeout(asking.current)
      asking.current = null
    }

    hold()
    wanted.current = null
    attempt.current += 1
    setFrom(second)
    setPosition(second)
    setProfile(asked)
    setSound(carrying)
    setPhase('waiting')
    setSource(
      pictureHref(
        d.id,
        second,
        onTheFly ? asked : undefined,
        onTheFly ? carrying : undefined,
      ),
    )
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

  const answer = (what: PlayerBezel) =>
    setBezel((last) => ({ ...what, nth: (last?.nth ?? 0) + 1 }))

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

    if (plan.seeking === 'byRange' && video.current && source) {
      video.current.currentTime = at

      return
    }

    if (asking.current) {
      clearTimeout(asking.current)
    }

    asking.current = setTimeout(() => play(at), SETTLES_BEFORE_SEEK)
  }

  const step = (by: number) => {
    answerSeek(by < 0 ? 'back' : 'forward')
    choose((wanted.current ?? position) + by)
  }

  const chooseProfile = (next: string) => {
    const asked = next as PlaybackProfile

    if (phase === 'idle') {
      setProfile(asked)

      return
    }

    play(position, asked)
  }

  const chooseSound = (next: SoundTrack) => {
    if (phase === 'idle') {
      setSound(next)

      return
    }

    play(position, profile, next)
  }

  const chooseSpeed = (next: string) => {
    setSpeed(next)

    if (video.current) {
      video.current.playbackRate = Number(next)
    }
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
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined)

      return
    }

    void shell?.requestFullscreen?.().catch(() => undefined)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const command = playerCommand(event, {
      seeks: duration > 0,
      aimed: aimed.current,
    })

    if (!command) {
      return
    }

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
            poster={poster}
            preload="none"
            playsInline
            onLoadedMetadata={(event) => {
              event.currentTarget.playbackRate = Number(speed)
              event.currentTarget.volume = volume
              event.currentTarget.muted = muted
            }}
            onLoadedData={() =>
              setPhase((was) =>
                was === 'waiting' && !holding ? 'paused' : was,
              )
            }
            onPlaying={() => {
              setHolding(false)
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
              if (asking.current) {
                return
              }

              wanted.current = null
              setPosition(from + event.currentTarget.currentTime)
            }}
            className={cn(PLAYER_PICTURE, '[:fullscreen_&]:max-w-none')}
          />
          <canvas
            ref={holder}
            aria-hidden="true"
            data-slot="player-held-frame"
            data-holding={holding ? 'true' : undefined}
            className={cn(
              'pointer-events-none absolute inset-0 hidden data-[holding]:block',
              PLAYER_PICTURE,
              '[:fullscreen_&]:max-w-none',
            )}
          />
          {!pip.out && (
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
          <PlayerCenter
            standing={
              !pip.out && (phase === 'idle' || phase === 'paused')
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
          {pip.out && (
            <p
              role="status"
              className="pointer-events-none absolute inset-0 m-auto flex h-fit w-fit max-w-[88%] items-center justify-center rounded-full border border-white/25 bg-black/80 px-4 py-2 text-center text-ui font-medium text-(--pl-ink)"
            >
              ピクチャーインピクチャーで再生中
            </p>
          )}
          {!pip.out && (phase === 'waiting' || phase === 'diagnosing') && (
            <p
              role="status"
              className="pointer-events-none absolute inset-0 m-auto flex h-fit w-fit max-w-[88%] items-center justify-center gap-2 rounded-full border border-white/25 bg-black/80 px-4 py-2 text-center text-ui font-medium text-(--pl-ink)"
            >
              <Spinner className="text-(--pl-accent)" />
              {WAITING_ON[phase]}
            </p>
          )}
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
                onChoose={choose}
                onScrubbing={setScrubbingAt}
                frameHref={frameHref}
              />
            )}
            {said && (
              <p
                role="status"
                className={cn(
                  'mt-2 text-[11px] font-medium',
                  said.tone === 'ok' ? 'text-[#9FDCBB]' : 'text-[#EC9A93]',
                )}
              >
                {said.text}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-x-1 gap-y-2">
              <PlayerTip
                name={phase === 'playing' ? '一時停止' : '再生'}
                keys={[KEY_CAP.toggle]}
                container={shell}
              >
                <button
                  type="button"
                  aria-label={phase === 'playing' ? '一時停止' : '再生'}
                  onClick={toggle}
                  className={PLAYER_GLYPH_BUTTON}
                >
                  {phase === 'playing' ? <PauseGlyph /> : <PlayGlyph />}
                </button>
              </PlayerTip>
              {duration > 0 && (
                <>
                  <PlayerTip
                    name={`${SEEK_STEP_SECONDS}秒戻る`}
                    keys={[KEY_CAP.back]}
                    container={shell}
                  >
                    <button
                      type="button"
                      aria-label={`${SEEK_STEP_SECONDS}秒戻る`}
                      onClick={() => step(-SEEK_STEP_SECONDS)}
                      className={PLAYER_GLYPH_BUTTON}
                    >
                      <SkipBackIcon seconds={SEEK_STEP_SECONDS} />
                    </button>
                  </PlayerTip>
                  <PlayerTip
                    name={`${SEEK_STEP_SECONDS}秒進む`}
                    keys={[KEY_CAP.forward]}
                    container={shell}
                  >
                    <button
                      type="button"
                      aria-label={`${SEEK_STEP_SECONDS}秒進む`}
                      onClick={() => step(SEEK_STEP_SECONDS)}
                      className={PLAYER_GLYPH_BUTTON}
                    >
                      <SkipForwardIcon seconds={SEEK_STEP_SECONDS} />
                    </button>
                  </PlayerTip>
                </>
              )}
              <PlayerTip name="消音" keys={[KEY_CAP.mute]} container={shell}>
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
              </PlayerTip>
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
              <span className="ml-2 font-code text-[13px] font-medium whitespace-nowrap text-(--pl-ink) tabular-nums">
                {formatPlayerTime(scrubbingAt ?? position)} /{' '}
                {formatPlayerTime(duration)}
              </span>
              <div className="ml-auto flex flex-wrap items-center gap-x-1 gap-y-2 max-[700px]:ml-0">
                <PlayerTip name="AirPlay" container={shell}>
                  <AirPlayButton
                    id={d.id}
                    onTakeTicket={onTakeTicket}
                    video={video}
                    onRefused={(message) =>
                      setSaid({ text: message, tone: 'err' })
                    }
                  />
                </PlayerTip>
                <PlayerTip name="字幕" container={shell}>
                  <button
                    type="button"
                    disabled
                    aria-label="字幕"
                    aria-pressed={false}
                    className={PLAYER_GLYPH_BUTTON}
                  >
                    <CaptionsGlyph />
                  </button>
                </PlayerTip>
                <PlayerTip name="設定" container={shell}>
                  <PlayerSettings
                    container={shell}
                    onOpenChange={setSettingsOpen}
                    profile={profile}
                    onChooseProfile={chooseProfile}
                    onTheFly={onTheFly}
                    speed={speed}
                    onChooseSpeed={chooseSpeed}
                    sounds={plan.sounds}
                    sound={sound}
                    onChooseSound={chooseSound}
                  />
                </PlayerTip>
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
                {pip.offered && (
                  <PlayerTip name="ピクチャーインピクチャー" container={shell}>
                    <button
                      type="button"
                      aria-label="ピクチャーインピクチャー"
                      aria-pressed={pip.out}
                      disabled={!framed}
                      onClick={pip.toggle}
                      className={cn(
                        PLAYER_GLYPH_BUTTON,
                        pip.out && PLAYER_GLYPH_BUTTON_ON,
                      )}
                    >
                      <PictureInPictureIcon />
                    </button>
                  </PlayerTip>
                )}
                <PlayerTip
                  name="全画面"
                  keys={[KEY_CAP.fullscreen]}
                  container={shell}
                >
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
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
