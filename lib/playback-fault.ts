import { PLAYBACK_REFUSAL_TOO_MANY } from '@/repository/video-paths'

export type PlainFault =
  | 'leftScrambled'
  | 'tooManyAtOnce'
  | 'nothingToPlay'
  | 'undecodable'
  | 'theBrowserWouldNotPlay'
  | 'transcode'

export type AnswerSays = Exclude<PlainFault, 'leftScrambled'> | 'refused'

export interface PlaybackAnswer {
  status: number
  refusal: string | null
}

export function whatTheAnswerSays(
  answer: PlaybackAnswer,
  transcodes: boolean,
): AnswerSays {
  if (answer.refusal === PLAYBACK_REFUSAL_TOO_MANY) {
    return 'tooManyAtOnce'
  }

  if (answer.status === 400) {
    return 'refused'
  }

  if (answer.status === 404) {
    return 'nothingToPlay'
  }

  if (answer.status < 200 || answer.status >= 300) {
    return 'transcode'
  }

  return transcodes ? 'theBrowserWouldNotPlay' : 'undecodable'
}
