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
