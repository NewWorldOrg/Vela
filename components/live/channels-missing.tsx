'use client'

import Link from 'next/link'

import type { ChannelKind } from '@/repository/channels'
import { CHANNEL_KIND_TAB } from '@/repository/channels'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/vela/empty-state'

/**
 * Where the channels would be, when there are none.
 *
 * There are two of these and they are not the same thing. A product with no
 * channels at all has not been scanned, and the way forward is the screen that
 * scans. A product with twenty-seven channels and none on the type being read
 * has been scanned, and telling that reader there is nothing to watch is
 * false: what there is nothing of is this one broadcast, and sending them to
 * add channels sends them to add what they already have. It is the same
 * mistake the canon named for the tuner ledger — a count that could not be
 * read is not a nought — one type further in.
 *
 * The way forward is the channels there are. That is where the one product
 * that faces the same aerial takes a reader whose type has emptied out
 * (KonomiTV repairs the selection to the first type that has channels), except
 * that here it is a press rather than something done to the reader: the type
 * is in the URL, a reader arrived at it by following a link that names it, and
 * answering with a different type than the link says is a different screen.
 *
 * Nothing measured sends a reader to settings from here, and two of the four
 * draw nothing at all. Drawing nothing is not open to this product: every
 * empty face it has carries exactly one way forward, and a face reached by a
 * link has to carry its own.
 */
export function ChannelsMissing({
  kind,
  kinds,
  onKind,
  titleLevel,
  className,
}: {
  /** The type being read. */
  kind: ChannelKind
  /** The types that have a channel, in the order they are listed. */
  kinds: ChannelKind[]
  onKind: (kind: ChannelKind) => void
  titleLevel?: 2 | 3
  className?: string
}) {
  const elsewhere = kinds[0]

  if (elsewhere === undefined) {
    return (
      <EmptyState
        spot="antenna"
        titleLevel={titleLevel}
        title="視聴できるチャンネルがありません"
        className={className}
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/channels">チャンネル設定へ</Link>
          </Button>
        }
      />
    )
  }

  return (
    <EmptyState
      spot="antenna"
      titleLevel={titleLevel}
      title={`${CHANNEL_KIND_TAB[kind]}のチャンネルがありません`}
      className={className}
      action={
        <Button variant="outline" size="sm" onClick={() => onKind(elsewhere)}>
          {CHANNEL_KIND_TAB[elsewhere]}のチャンネルへ
        </Button>
      }
    />
  )
}
