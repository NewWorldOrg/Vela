import { storingCookie } from '@/lib/stored-flag'

export type PlaybackFormat = 'h264' | 'h265' | 'av1'

export type FormatChoice = 'auto' | PlaybackFormat

export const FORMAT_COOKIE = 'vela-format'

const H264: PlaybackFormat = 'h264'

const AUTO: FormatChoice = 'auto'

const FORMATS: readonly PlaybackFormat[] = ['h264', 'h265', 'av1']

const AUTO_ORDER: readonly PlaybackFormat[] = ['av1', 'h265', 'h264']

const LABELS: Record<FormatChoice, string> = {
  auto: '自動',
  h264: 'H.264',
  h265: 'H.265',
  av1: 'AV1',
}

/** The types a browser is asked about, as Carina writes them: H.265 tagged hvc1, Main, level 4.1, and AV1 Main, level 4.1, 8 bits. */
export const FORMAT_IN_MP4 = {
  h265: 'video/mp4; codecs="hvc1.1.6.L123.B0"',
  av1: 'video/mp4; codecs="av01.0.09M.08"',
} as const

const NOMINAL_BITRATE = 8_000_000

export interface PictureSize {
  width: number
  height: number
  framerate: number
}

export interface FormatAnswer {
  supported: boolean
  powerEfficient: boolean
}

export interface FormatAnswers {
  /** Whether the media capabilities answered; a browser without them is asked whether its media source takes the type. */
  byCapabilities: boolean
  h265: FormatAnswer
  av1: FormatAnswer
}

export interface FormatProbe {
  decodingInfo?: (configuration: {
    type: 'media-source'
    video: {
      contentType: string
      width: number
      height: number
      bitrate: number
      framerate: number
    }
  }) => Promise<FormatAnswer>
  isTypeSupported?: (type: string) => boolean
}

export type FormatSettled =
  { settled: false } | { settled: true; format?: PlaybackFormat }

const NOT_PLAYED: FormatAnswer = { supported: false, powerEfficient: false }

export function formatLabel(choice: FormatChoice): string {
  return LABELS[choice]
}

export function formatOf(
  said: string | null | undefined,
): PlaybackFormat | undefined {
  return FORMATS.find((one) => one === said)
}

export function formatChoiceOf(said: string | null | undefined): FormatChoice {
  return formatOf(said) ?? AUTO
}

export function formatCookie(choice: FormatChoice): string {
  return storingCookie(FORMAT_COOKIE, choice)
}

async function capable(
  decodingInfo: NonNullable<FormatProbe['decodingInfo']>,
  type: string,
  picture: PictureSize,
): Promise<FormatAnswer> {
  try {
    const info = await decodingInfo({
      type: 'media-source',
      video: {
        contentType: type,
        width: picture.width,
        height: picture.height,
        bitrate: NOMINAL_BITRATE,
        framerate: picture.framerate,
      },
    })

    return {
      supported: info.supported,
      powerEfficient: info.supported && info.powerEfficient,
    }
  } catch {
    return NOT_PLAYED
  }
}

function taken(probe: FormatProbe, type: string): FormatAnswer {
  try {
    return {
      supported: probe.isTypeSupported?.(type) === true,
      powerEfficient: false,
    }
  } catch {
    return NOT_PLAYED
  }
}

/** Asks the browser whether it plays H.265 and AV1 fed through a media source, at the size and rate of the picture. */
export async function askFormats(
  probe: FormatProbe,
  picture: PictureSize,
): Promise<FormatAnswers> {
  const { decodingInfo } = probe

  if (!decodingInfo) {
    return {
      byCapabilities: false,
      h265: taken(probe, FORMAT_IN_MP4.h265),
      av1: taken(probe, FORMAT_IN_MP4.av1),
    }
  }

  const [h265, av1] = await Promise.all([
    capable(decodingInfo, FORMAT_IN_MP4.h265, picture),
    capable(decodingInfo, FORMAT_IN_MP4.av1, picture),
  ])

  return { byCapabilities: true, h265, av1 }
}

function answerFor(
  format: PlaybackFormat,
  answers: FormatAnswers,
): FormatAnswer | undefined {
  return format === 'h264' ? undefined : answers[format]
}

function plays(format: PlaybackFormat, answers: FormatAnswers): boolean {
  return answerFor(format, answers)?.supported ?? true
}

function playsLightly(format: PlaybackFormat, answers: FormatAnswers): boolean {
  const answer = answerFor(format, answers)

  if (!answer) {
    return true
  }

  if (!answers.byCapabilities) {
    return answer.supported && format !== 'av1'
  }

  return answer.powerEfficient
}

/** Whether the browser has to be asked before a format is settled: only where Carina transcodes in more than H.264. */
export function asksTheBrowser(
  offered: readonly PlaybackFormat[] | undefined,
): boolean {
  return offered?.some((one) => one !== H264) ?? false
}

/** 自動, H.264 and each format Carina transcodes in that the browser plays at all; none where that leaves only 自動 and H.264. */
export function formatChoices(
  offered: readonly PlaybackFormat[] | undefined,
  answers: FormatAnswers | undefined,
): FormatChoice[] {
  if (!offered || !answers) {
    return []
  }

  const choices: FormatChoice[] = [
    AUTO,
    H264,
    ...FORMATS.filter(
      (one) => one !== H264 && offered.includes(one) && plays(one, answers),
    ),
  ]

  return choices.length > 2 ? choices : []
}

export function choiceShown(
  choice: FormatChoice,
  choices: readonly FormatChoice[],
): FormatChoice | undefined {
  if (choices.length === 0) {
    return undefined
  }

  return choices.includes(choice) ? choice : AUTO
}

/** The format a picture is asked for in: the one chosen while it can be played, and otherwise the first of AV1, H.265 and H.264 that plays in the hardware. */
export function formatToPlay(
  choice: FormatChoice,
  offered: readonly PlaybackFormat[] | undefined,
  answers: FormatAnswers | undefined,
): FormatSettled {
  if (!offered) {
    return { settled: true, format: undefined }
  }

  if (!asksTheBrowser(offered)) {
    return { settled: true, format: H264 }
  }

  if (!answers) {
    return { settled: false }
  }

  const chosen = formatOf(choice)

  if (chosen && formatChoices(offered, answers).includes(chosen)) {
    return { settled: true, format: chosen }
  }

  return {
    settled: true,
    format:
      AUTO_ORDER.find(
        (one) => offered.includes(one) && playsLightly(one, answers),
      ) ?? H264,
  }
}
