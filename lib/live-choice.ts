export interface ChannelChoice {
  answered: string | undefined
  chosen: string
}

export function choiceStillStands(
  choice: ChannelChoice | undefined,
  answered: string | undefined,
): ChannelChoice | undefined {
  if (choice === undefined || choice.answered !== answered) {
    return undefined
  }

  return choice
}

export function channelBeingWatched(
  choice: ChannelChoice | undefined,
  answered: string | undefined,
): string | undefined {
  return choiceStillStands(choice, answered)?.chosen ?? answered
}
