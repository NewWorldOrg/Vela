'use client'

import {
  useCallback,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react'

import { CURTAIN_HOLD_MS, CURTAIN_IDLE, FOLDS_ON_A_SIDE } from '@/lib/curtain'
import { Usher, UsherStar } from '@/components/vela/marks'

function nothingChanges(): () => void {
  return () => undefined
}

function builtInTheBrowser(): boolean {
  return false
}

function builtFromTheServer(): boolean {
  return true
}

function movementsOf(node: HTMLElement): Animation[] {
  if (typeof node.getAnimations !== 'function') {
    return []
  }

  return node.getAnimations({ subtree: true })
}

function nameOf(running: Animation): string | null {
  return 'animationName' in running ? String(running.animationName) : null
}

function openNow(movements: Animation[]): void {
  for (const running of movements) {
    const at = running.currentTime

    if (
      nameOf(running) !== CURTAIN_IDLE &&
      typeof at === 'number' &&
      at < CURTAIN_HOLD_MS
    ) {
      running.currentTime = CURTAIN_HOLD_MS
    }
  }
}

const FOLDS: number[] = Array.from(
  { length: FOLDS_ON_A_SIDE },
  (_, fold) => fold,
)

const TWINKLES: {
  shape: 'star' | 'dot'
  tone: 'spark' | 'ink'
  at: CSSProperties
}[] = [
  {
    shape: 'star',
    tone: 'spark',
    at: {
      left: '84%',
      top: '-14%',
      width: '12%',
      height: '12%',
      '--tx': '34px',
      '--ty': '-30px',
    } as CSSProperties,
  },
  {
    shape: 'star',
    tone: 'spark',
    at: {
      left: '40%',
      top: '-18%',
      width: '9%',
      height: '9%',
      '--tx': '-26px',
      '--ty': '-38px',
    } as CSSProperties,
  },
  {
    shape: 'dot',
    tone: 'spark',
    at: {
      left: '94%',
      top: '14%',
      width: '8%',
      height: '8%',
      '--tx': '40px',
      '--ty': '6px',
    } as CSSProperties,
  },
  {
    shape: 'dot',
    tone: 'ink',
    at: {
      left: '22%',
      top: '4%',
      width: '7%',
      height: '7%',
      '--tx': '-38px',
      '--ty': '-8px',
    } as CSSProperties,
  },
]

function Tassel() {
  return (
    <svg viewBox="0 0 34 74" className="block size-full overflow-visible">
      <g className="fill-spark">
        <circle cx="17" cy="8" r="7" />
        <rect x="11" y="13" width="12" height="8" rx="3" />
        <path
          d="M9 22 H25 L31 66 Q17 74 3 66 Z"
          className="stroke-spark"
          strokeWidth={3}
          strokeLinejoin="round"
        />
      </g>
      <g className="fill-none stroke-(--fold-shade)" opacity={0.55}>
        <path
          d="M12 30 L10 64 M17 30 V67 M22 30 L24 64"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </g>
      <rect
        x="8"
        y="22"
        width="18"
        height="5"
        rx="2.5"
        className="fill-(--fold-shade)"
        opacity={0.55}
      />
    </svg>
  )
}

function Side() {
  return (
    <div className="curtain-side">
      {FOLDS.map((fold) => (
        <div
          key={fold}
          className="curtain-fold"
          data-lead={fold === FOLDS_ON_A_SIDE - 1 ? '' : undefined}
          style={{ '--i': fold } as CSSProperties}
        >
          <div className="curtain-fold-sway">
            <div className="curtain-fold-up">
              <div className="curtain-fold-paint" />
            </div>
            <div className="curtain-fold-lo">
              <div className="curtain-fold-paint" />
            </div>
          </div>
        </div>
      ))}
      <div className="curtain-tie">
        <span className="curtain-tie-loop bg-spark" />
        <span className="curtain-tassel">
          <Tassel />
        </span>
      </div>
    </div>
  )
}

/**
 * The curtain drawn closed in the first HTML of every full load: folds of cloth
 * drawn aside and tied back, while the usher pulls the cord and flies to the mark.
 * It rises only over a page hydrated from the server's HTML, never over one
 * built in the browser by a navigation.
 */
export function Curtain() {
  const fromTheServer = useSyncExternalStore(
    nothingChanges,
    builtInTheBrowser,
    builtFromTheServer,
  )
  const [raising, setRaising] = useState<boolean>(fromTheServer)

  const raised = useCallback((node: HTMLDivElement | null) => {
    if (node === null) {
      return
    }

    const movements = movementsOf(node)
    let gone = false

    openNow(movements)
    Promise.all(movements.map((running) => running.finished)).then(
      () => {
        if (!gone) {
          setRaising(false)
        }
      },
      () => undefined,
    )

    return () => {
      gone = true
    }
  }, [])

  if (!raising) {
    return null
  }

  return (
    <div
      ref={raised}
      data-slot="curtain"
      aria-hidden="true"
      className="curtain pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      <div className="curtain-half" data-side="left">
        <Side />
      </div>
      <div className="curtain-half" data-side="right">
        <Side />
      </div>
      <div className="curtain-valance" />
      <div className="curtain-cord" />
      <div className="curtain-usher-x">
        <div className="curtain-usher-y">
          <div className="curtain-usher-z">
            <div className="curtain-usher-s">
              <Usher
                mood="plain"
                edged
                starless
                className="curtain-usher-plain size-full"
              />
              <Usher
                mood="glad"
                edged
                starless
                className="curtain-usher-glad size-full"
              />
              <span className="curtain-usher-star block">
                <UsherStar className="block size-full" />
              </span>
              {TWINKLES.map(({ shape, tone, at }, nth) => (
                <span key={nth} className="curtain-twinkle block" style={at}>
                  <svg
                    viewBox="-10 -10 20 20"
                    className={`block size-full overflow-visible ${tone === 'spark' ? 'fill-spark' : 'fill-ink'}`}
                  >
                    {shape === 'star' ? (
                      <path d="M0 -9 Q2 -2 9 0 Q2 2 0 9 Q-2 2 -9 0 Q-2 -2 0 -9Z" />
                    ) : (
                      <circle r="7" />
                    )}
                  </svg>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="curtain-dock">
        <span className="curtain-dock-ring block" />
      </div>
    </div>
  )
}
