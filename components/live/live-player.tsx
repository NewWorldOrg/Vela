'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

import { cn } from '@/lib/utils'
import type { LiveStartup, LiveStartupSegment } from '@/lib/live-wire'
import type { LiveChannel, LiveProfile } from '@/repository/live'
import {
  MAIN_SOUND,
  soundsAnnounced,
  type SoundTrack,
} from '@/repository/sounds'
import { liveWireHref } from '@/repository/live-paths'
import { KEY_CAP, playerCommand, VOLUME_STEP_PERCENT } from '@/lib/player-keys'
import { PlayerTip } from '@/components/recordings/player-tip'
import { unaskedIn } from '@/lib/live-profiles'
import {
  CATCH_UP_RATE,
  delayOf,
  holdOf,
  latencyTone,
  losingGround,
  reachOf,
  targetOf,
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
  SAID_CAPTURED,
  SAID_NOT_CAPTURED,
  takeCapture as takeItNow,
  type TakeCapture,
} from '@/components/recordings/take-capture'
import { capturedName, capturedOn } from '@/lib/capture-name'
import { usePictureInPicture } from '@/hooks/usePictureInPicture'
import {
  PlayerCenter,
  type PlayerBezel,
} from '@/components/recordings/player-center'

import { CaptionLayer } from '@/components/live/live-captions'
import { LiveFeed } from '@/components/live/live-feed'
import {
  askLiveBacklog,
  askWhetherSignedOut,
  openLiveSession,
  type AskBacklog,
  type OpenSocket,
} from '@/components/live/live-session'
import { LiveFaultNotice, type LiveFault } from '@/components/live/live-notice'
import { LiveSettings } from '@/components/live/live-settings'
import { LiveStartupSteps } from '@/components/live/live-startup'

const RESTS = 3000

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
  ok: 'border-[rgba(134,210,172,.45)] bg-[rgba(134,210,172,.12)] text-[#9FDCBB]',
  warn: 'border-[rgba(229,186,108,.5)] bg-[rgba(229,186,108,.14)] text-[#E5BA6C]',
  err: 'border-[rgba(236,154,147,.5)] bg-[rgba(236,154,147,.14)] text-[#EC9A93]',
} as const

export function LivePlayer({
  channel,
  profiles,
  returnPath,
  openSocket,
  askSignedOut = askWhetherSignedOut,
  askBacklog = askLiveBacklog,
  wireHref = liveWireHref,
  startupDeadlineMs = STARTUP_DEADLINE_MS,
  takeCapture = takeItNow,
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
  ) => string
  startupDeadlineMs?: number
  takeCapture?: TakeCapture
}) {
  const video = useRef<HTMLVideoElement>(null)
  const overlay = useRef<HTMLCanvasElement>(null)
  const captions = useRef<CaptionLayer | null>(null)
  const [captioned, setCaptioned] = useState(true)
  const [shell, setShell] = useState<HTMLElement | null>(null)
  const [profile, setProfile] = useState(() => unaskedIn(profiles))
  const [chosenSound, setChosenSound] = useState<{
    of: string
    track: SoundTrack
  } | null>(null)
  const [retries, setRetries] = useState<Retries | null>(null)
  const [held, setHeld] = useState<Running | null>(null)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [full, setFull] = useState(false)
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
  const sounds: readonly SoundTrack[] = soundsAnnounced(
    channel?.now?.sounds ?? 0,
  )
  const sound =
    sounds.length > 1 && chosenSound !== null && chosenSound.of === channel?.id
      ? chosenSound.track
      : MAIN_SOUND
  const seat =
    networkId === undefined || serviceId === undefined || profile === undefined
      ? null
      : `${networkId}:${serviceId}:${profile}:${sound}`
  const retried = retries && retries.of === seat ? retries : null
  const attempt = retried?.count ?? 0
  const key = seat === null ? null : `${seat}:${attempt}`

  const reconnecting =
    retried && (retried.after === 'dropped' || retried.after === 'ended')
      ? retried.count
      : undefined

  const running: Running | null =
    key === null ? null : held && held.key === key ? held : begun(key)
  const phase = running?.phase
  const fault = running?.fault ?? null

  useEffect(() => {
    const read = () => setFull(document.fullscreenElement === shell)

    document.addEventListener('fullscreenchange', read)

    return () => document.removeEventListener('fullscreenchange', read)
  }, [shell])

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
      !element
    ) {
      return
    }

    const change = (patch: (was: Running) => Running) =>
      setHeld((was) => patch(was && was.key === key ? was : begun(key)))

    let settled = false

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
    let gone = false
    let edge = -1
    let edgeMovedAt = performance.now()
    let quickenedSince: number | null = null
    let gapWhenQuickened = 0
    const openedAt = performance.now()
    const seated = { networkId, serviceId, profile, sound }
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

    const feed = new LiveFeed(element, (why) => {
      session.leave()
      fail({ kind: why })
    })

    const layer = overlay.current
      ? new CaptionLayer(overlay.current, element)
      : null

    captions.current = layer

    const session = openLiveSession(
      wireHref(networkId, serviceId, profile, sound),
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

      const now = performance.now()
      const elapsedMs = now - openedAt

      if (!pictured && elapsedMs >= startupDeadlineMs) {
        clearInterval(ticking)
        session.leave()
        fail({ kind: 'tookTooLong' })

        return
      }

      change((was) => (was.phase === 'starting' ? { ...was, elapsedMs } : was))

      if (!asking && elapsedMs - askedAt >= BACKLOG_EVERY_MS) {
        asking = true
        askedAt = elapsedMs

        void askBacklog(seated).then((read) => {
          asking = false

          if (gone || settled || !read) {
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
    sound,
    openSocket,
    askSignedOut,
    askBacklog,
    wireHref,
    startupDeadlineMs,
  ])

  const heard = (patch: (was: Running) => Running) => {
    if (key === null) {
      return
    }

    setHeld((was) => patch(was && was.key === key ? was : begun(key)))
  }

  const pip = usePictureInPicture(video)
  const captionsDrawn = captioned && !pip.out && phase !== 'faulted'
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
      seeks: false,
      captions: true,
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

  useEffect(() => {
    if (hasPicture) {
      shell?.focus({ preventScroll: true })
    }
  }, [shell, hasPicture])

  const latency = running?.latency
  const losing = running?.losing ?? false

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
            data-drawn={captionsDrawn ? 'yes' : 'no'}
            className="pointer-events-none absolute inset-0 size-full"
          />
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
          />
        )}
        {hasPicture && (
          <PlayerCenter
            standing={!pip.out && phase === 'paused' ? 'play' : undefined}
            onStanding={() => {
              shell?.focus({ preventScroll: true })
              toggle()
            }}
            bezel={bezel ?? undefined}
          />
        )}
        {channel && running && phase !== 'faulted' && (
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
          {said && (
            <p
              role="status"
              className={cn(
                'mb-2 text-[11px] font-medium',
                said.tone === 'ok' ? 'text-[#9FDCBB]' : 'text-[#EC9A93]',
              )}
            >
              {said.text}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
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
                className={PLAYER_GLYPH_BUTTON}
              >
                {phase === 'playing' ? <PauseGlyph /> : <PlayGlyph />}
              </button>
            </PlayerTip>
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
            {latency !== undefined && (
              <span
                data-slot="live-latency"
                data-tone={latencyTone(latency, losing)}
                className={cn(
                  'inline-flex items-center gap-[7px] rounded-full border px-3 py-[3px] text-[11.5px] font-medium whitespace-nowrap',
                  LATENCY_TONE[latencyTone(latency, losing)],
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
              <PlayerTip
                name="字幕"
                keys={[KEY_CAP.captions]}
                container={shell}
              >
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
              </PlayerTip>
              <PlayerTip name="設定" container={shell}>
                <LiveSettings
                  container={shell}
                  onOpenChange={setSettingsOpen}
                  profiles={profiles}
                  profile={profile}
                  onChooseProfile={setProfile}
                  sounds={sounds}
                  sound={sound}
                  onChooseSound={(next) => {
                    if (channel) {
                      setChosenSound({ of: channel.id, track: next })
                    }
                  }}
                  dropped={running?.dropped}
                  droppedByThoseStillWatching={
                    running?.droppedByThoseStillWatching
                  }
                  lostOnTheWayIn={running?.lostOnTheWayIn}
                />
              </PlayerTip>
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
              {pip.offered && (
                <PlayerTip name="ピクチャーインピクチャー" container={shell}>
                  <button
                    type="button"
                    aria-label="ピクチャーインピクチャー"
                    aria-pressed={pip.out}
                    disabled={!hasPicture}
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
  )
}
