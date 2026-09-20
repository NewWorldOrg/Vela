import type { LiveChannel } from '@/repository/live'

export interface ChannelInFull {
  name: string
  now?: string
  description?: string
  next?: { at: string; title: string }
}

export function channelInFull(channel: LiveChannel): ChannelInFull {
  return {
    name: channel.name,
    now: channel.now?.title,
    description: channel.now?.description,
    next: channel.next && {
      at: channel.next.startLabel,
      title: channel.next.title,
    },
  }
}
