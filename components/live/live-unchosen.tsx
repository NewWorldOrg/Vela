import { cn } from '@/lib/utils'
import { PLAYER_FACE } from '@/components/recordings/player-palette'
import { EmptyState } from '@/components/vela/empty-state'

/**
 * The live screen before a channel is chosen.
 *
 * No player stands here. A player with nothing in it is a black rectangle with
 * no picture, no controls and nothing to press — the screen at its emptiest,
 * drawn as though it were at its fullest — and no service that shows video puts
 * one on the screen before there is something to put in it. What takes its
 * place is the panel this application says "nothing here yet" with everywhere
 * else, in the box the picture will appear in, so that choosing a channel fills
 * the box rather than moving it.
 *
 * There is nothing under it: what is on now is read off the channel being
 * watched, and until one is chosen there is no room to keep for it.
 */
export function LiveUnchosen({ className }: { className?: string }) {
  return (
    <EmptyState
      spot="antenna"
      titleLevel={2}
      title="チャンネルが選ばれていません"
      className={cn(
        PLAYER_FACE,
        'flex flex-col items-center justify-center',
        className,
      )}
    />
  )
}
