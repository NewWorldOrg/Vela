import { foldedGuideOf, type FoldableColumn } from '@/lib/guide'

/** A channel of the live line-up, as the fold below reads one. */
export interface FoldableChannel extends FoldableColumn {
  /** What is on it at this moment, where the guide has said. */
  now?: { startsAt: string; endsAt?: string; title: string }
}

/**
 * The line-up with the splits that are showing nothing but what they split
 * from taken out.
 *
 * A station splits into two or three for the hours it has that much to show
 * and puts the one thing out on all of them for the rest of the day, so most
 * of the time most of the line-up is one programme listed two or three times
 * over. Measured on one aerial: 27 terrestrial services, of which 15 spent a
 * whole day drawing nothing their station was not already drawing.
 *
 * What is compared is what the card draws — the run and the name of what is on
 * now — and not what the broadcaster said about it, for the reason the guide's
 * fold compares drawn cells: a station spells the same arrangement two ways and
 * sends both, so a fold that reads only the naming leaves most of the
 * repetition on screen. This is the guide's own fold, given the one hour a card
 * draws instead of a day of them.
 *
 * A split with nothing on it at all goes too: with no programme it has nothing
 * to say it is not repeating, and a card with a station's name and no
 * programme is the emptiest thing the screen could offer to press. The whole
 * services are never taken — a whole service with no programme is a service
 * whose listings have not arrived, which is a different thing.
 *
 * The channel being watched is never taken. Folding is about what there is to
 * choose from, and the one already chosen is not that.
 */
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

/**
 * Whether folding would take a card away, which is when there is a fold to
 * offer. A line-up whose splits are all showing something of their own — or
 * one with no split in it — is a line-up the press cannot change, and a press
 * that cannot change anything is not drawn.
 */
export function foldsAChannel<C extends FoldableChannel>(
  channels: readonly C[],
  watchingId?: string,
): boolean {
  return foldedLineupOf(channels, watchingId).length < channels.length
}
