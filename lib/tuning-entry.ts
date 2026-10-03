import { wordFor } from '@/lib/not-yet-in-this-build'
import type { ScanSystem } from '@/repository/scan-systems'
import { SYSTEM_LABEL } from '@/repository/scan-systems'
import type { CandidateTuning } from '@/repository/services'

export interface TuningEntry {
  system: ScanSystem
  channel: string
  stream: string
}

export interface TuningProblem {
  field: 'channel' | 'stream'
  text: string
}

export type TuningReading =
  | { state: 'read'; tuning: CandidateTuning }
  | { state: 'refused'; problem: TuningProblem }

export interface TuningChannelRange {
  hint: string
  ts: boolean
  accepts: (channel: number) => boolean
}

const TUNING_CHANNEL_RANGE: Record<ScanSystem, TuningChannelRange> = {
  isdbT: {
    hint: '13 〜 62',
    ts: false,
    accepts: (channel) => channel >= 13 && channel <= 62,
  },
  isdbSBs: {
    hint: '1 〜 23 の奇数(7 と 17 を除く)',
    ts: true,
    accepts: (channel) =>
      channel >= 1 &&
      channel <= 23 &&
      channel % 2 === 1 &&
      ![7, 17].includes(channel),
  },
  isdbSCs110: {
    hint: '2 〜 24 の偶数',
    ts: false,
    accepts: (channel) => channel >= 2 && channel <= 24 && channel % 2 === 0,
  },
}

export const TUNING_STREAM_HIGHEST = 65535

export const EMPTY_TUNING_ENTRY: TuningEntry = {
  system: 'isdbT',
  channel: '',
  stream: '',
}

function toNumber(value: string): number | undefined {
  const trimmed = value.trim()

  return trimmed !== '' && /^\d+$/.test(trimmed) ? Number(trimmed) : undefined
}

function refused(field: TuningProblem['field'], text: string): TuningReading {
  return { state: 'refused', problem: { field, text } }
}

export function tuningChannelRangeOf(system: ScanSystem): TuningChannelRange {
  return TUNING_CHANNEL_RANGE[system]
}

export function readTuningEntry(entry: TuningEntry): TuningReading {
  const range = tuningChannelRangeOf(entry.system)
  const physicalChannel = toNumber(entry.channel)

  if (physicalChannel === undefined) {
    return refused('channel', '物理チャンネルを半角数字で入力してください。')
  }

  if (!range.accepts(physicalChannel)) {
    return refused(
      'channel',
      `${wordFor(SYSTEM_LABEL, entry.system)}の物理チャンネルは ${range.hint} です。`,
    )
  }

  const transportStreamId = range.ts ? toNumber(entry.stream) : undefined

  if (range.ts && transportStreamId === undefined) {
    return refused(
      'stream',
      'BS はスロット内の TSID を半角数字で入力してください。',
    )
  }

  if (
    transportStreamId !== undefined &&
    transportStreamId > TUNING_STREAM_HIGHEST
  ) {
    return refused('stream', `TSID は 0 〜 ${TUNING_STREAM_HIGHEST} です。`)
  }

  return {
    state: 'read',
    tuning: { system: entry.system, physicalChannel, transportStreamId },
  }
}
