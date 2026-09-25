'use client'

import type { CSSProperties } from 'react'

import { type BurstShape, type BurstTone, burstPiecesOf } from '@/lib/arrival'
import { cn } from '@/lib/utils'

const PIECES = burstPiecesOf(20)

const TONE: Record<BurstTone, string> = {
  spark: 'text-spark',
  surface: 'text-surface',
  ink: 'text-ink',
}

function Shape({ shape }: { shape: BurstShape }) {
  if (shape === 'circle') {
    return <circle cx="6" cy="6" r="5" fill="currentColor" />
  }

  if (shape === 'square') {
    return (
      <rect x="1.5" y="1.5" width="9" height="9" rx="1.5" fill="currentColor" />
    )
  }

  if (shape === 'triangle') {
    return (
      <path
        d="M6 1.5 10.8 10H1.2Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    )
  }

  return (
    <path
      d={
        shape === 'cross'
          ? 'M2.5 2.5 9.5 9.5M9.5 2.5 2.5 9.5'
          : 'M6 1.5v9M1.5 6h9'
      }
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
    />
  )
}

export function GuideOpening({
  seam,
  line,
  open,
  onLanded,
  onDone,
}: {
  seam: number
  line: boolean
  open: boolean
  onLanded: () => void
  onDone: () => void
}) {
  return (
    <div
      aria-hidden="true"
      data-guide-opening
      data-open={open ? '' : undefined}
      onAnimationEnd={(event) => {
        if (event.animationName === 'ball-landing') {
          onLanded()
        }

        if (
          open &&
          event.animationName === 'opening-piece' &&
          event.target instanceof Element &&
          event.target.hasAttribute('data-last')
        ) {
          onDone()
        }
      }}
      className="guide-opening pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-lg"
    >
      <span
        className="guide-opening-above absolute inset-x-0 top-0 rounded-b-3xl bg-brand"
        style={{ height: `${seam}px` }}
      />
      <span
        className="guide-opening-below absolute inset-x-0 bottom-0 rounded-t-3xl bg-brand"
        style={{ top: `${seam}px` }}
      />
      {line && (
        <span
          className="guide-opening-line absolute right-0 left-0 h-0.5 bg-surface"
          style={{ top: `${seam - 1}px` }}
        />
      )}
      <span className="absolute left-1/2 size-0" style={{ top: `${seam}px` }}>
        <span className="guide-opening-ring border-spark" />
        <span
          className="guide-opening-ring border-surface"
          style={{ '--delay': '0.18s' } as CSSProperties}
        />
        {PIECES.map((piece, i) => (
          <svg
            key={i}
            viewBox="0 0 12 12"
            data-last={piece.last ? '' : undefined}
            className={cn('guide-opening-piece', TONE[piece.tone])}
            style={
              {
                '--angle': `${piece.angle}deg`,
                '--far': `${piece.far}cqw`,
                '--spin': `${piece.spin}deg`,
                '--lag': `${piece.lag}ms`,
                width: `${piece.size}px`,
                height: `${piece.size}px`,
              } as CSSProperties
            }
          >
            <Shape shape={piece.shape} />
          </svg>
        ))}
      </span>
      {line && (
        <span
          className="guide-opening-ball absolute left-0 size-4"
          style={{ top: `${seam - 8}px` }}
        >
          <span className="guide-opening-ball-hop block size-4">
            <span className="guide-opening-ball-body block size-4 rounded-full bg-spark" />
          </span>
        </span>
      )}
    </div>
  )
}
