'use client'

import Link from 'next/link'

import type { ChannelKind } from '@/repository/channels'
import { CHANNEL_KIND_TAB } from '@/repository/channels'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/vela/empty-state'

export function ChannelsMissing({
  kind,
  kinds,
  onKind,
  titleLevel,
  className,
}: {
  kind: ChannelKind
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
