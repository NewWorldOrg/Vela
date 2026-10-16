import { watchingOf } from '@/lib/live-clock'
import type { LiveScreen, LiveWatching } from '@/repository/live'

export interface ChannelChoice {
  asked: string | undefined
  chosen: string
}

export function choiceStillStands(
  choice: ChannelChoice | undefined,
  asked: string | undefined,
): ChannelChoice | undefined {
  if (choice === undefined || choice.asked !== asked) {
    return undefined
  }

  return choice
}

export function channelBeingWatched(
  choice: ChannelChoice | undefined,
  asked: string | undefined,
  answered: string | undefined,
): string | undefined {
  return choiceStillStands(choice, asked)?.chosen ?? asked ?? answered
}

export function watchingChosen(
  screen: LiveScreen,
  id: string | undefined,
  now: Date,
): LiveWatching | undefined {
  const answered = screen.watching

  if (id === undefined || id === answered?.channel.id) {
    return answered
  }

  const listed = screen.channels.find((channel) => channel.id === id)

  return listed ? watchingOf(listed, now) : answered
}
