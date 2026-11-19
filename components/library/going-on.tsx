'use client'

import { type ReactNode } from 'react'
import type { Route } from 'next'
import Link from 'next/link'

import { playingOnHref } from '@/lib/playback-source'
import type { Recording } from '@/repository/recordings'

export function GoingOn({
  recording,
  still,
  className,
  children,
}: {
  recording: Recording
  still: boolean
  className?: string
  children: ReactNode
}) {
  if (still) {
    return <span className={className}>{children}</span>
  }

  return (
    <Link href={playingOnHref(recording.id) as Route} className={className}>
      {children}
    </Link>
  )
}
