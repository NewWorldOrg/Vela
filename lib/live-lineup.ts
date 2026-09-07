import { foldedGuideOf, type FoldableColumn } from '@/lib/guide'

export interface FoldableChannel extends FoldableColumn {
  now?: { startsAt: string; endsAt?: string; title: string }
}

export function foldedLineupOf<C extends FoldableChannel>(
  channels: readonly C[],
  watchingId?: string,
): C[] {
  const kept = new Set(
    foldedGuideOf(
      channels,
      channels.flatMap((channel) =>
        channel.now
          ? [
              {
                channelId: channel.id,
                startMin: Date.parse(channel.now.startsAt),
                durationMin: channel.now.endsAt
                  ? Date.parse(channel.now.endsAt) -
                    Date.parse(channel.now.startsAt)
                  : 0,
                title: channel.now.title,
              },
            ]
          : [],
      ),
    ).channels.map((channel) => channel.id),
  )

  return channels.filter(
    (channel) => kept.has(channel.id) || channel.id === watchingId,
  )
}

export function foldsAChannel<C extends FoldableChannel>(
  channels: readonly C[],
  watchingId?: string,
): boolean {
  return foldedLineupOf(channels, watchingId).length < channels.length
}
