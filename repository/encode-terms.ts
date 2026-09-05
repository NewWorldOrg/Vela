import type { components } from '@/repository/client/schema'

export type EncodeJobStatus = components['schemas']['EncodeJobStatus']
export type EncodeCodec = components['schemas']['EncodeCodec']
export type EncodeResolution = components['schemas']['EncodeResolution']
export type Deinterlace = components['schemas']['Deinterlace']
export type EncodeEncoder = components['schemas']['EncodeEncoder']
export type EncodeSwerve = NonNullable<components['schemas']['EncodeSwerve']>
export type EncodeFailure = components['schemas']['EncodeFailure']

export const ENCODE_JOB_STATUSES: EncodeJobStatus[] = [
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
]

export const STATUS_LABEL: Record<EncodeJobStatus, string> = {
  queued: '待機中',
  running: '実行中',
  completed: '完了',
  failed: '失敗',
  cancelled: '中止',
}

export const CODEC_LABEL: Record<EncodeCodec, string> = {
  h264: 'H.264',
  h265: 'H.265',
}

export const RESOLUTION_LABEL: Record<EncodeResolution, string> = {
  asSource: 'ソースのまま',
  fullHd: '1920×1080(フル HD)',
  hd: '1280×720(HD)',
}

export const DEINTERLACE_LABEL: Record<Deinterlace, string> = {
  leave: '解除しない',
  everyFrame: '30p',
  everyField: '60p',
}

export const ENCODER_LABEL: Record<EncodeEncoder, string> = {
  software: 'ソフトウェア',
  vaapi: 'VAAPI',
}

export const SWERVE_LABEL: Record<EncodeSwerve, string> = {
  theCardIsOutOfReach: 'GPU に到達できない',
  theCardCannotDoThisCodec: 'GPU がこのコーデックに非対応',
  theProcessorCannotDoThisCodec: 'CPU がこのコーデックに非対応',
}

export const FAILURE_LABEL: Record<EncodeFailure, string> = {
  ffmpegExitedNonZero: 'ffmpeg 非0終了',
  notEnoughRoom: '容量不足',
  sourceMissing: '元ファイル不在',
  capabilityUnavailable: 'capability 不足',
  timedOut: 'タイムアウト',
  destinationCollision: '出力先の衝突',
}

export const STALLED_LABEL = '停滞'

export const RECORDING_REMOVED_LABEL = '録画削除済み'

export const LABEL_LONGEST = 64

export const RATE_CONTROL_FINEST = 0

export const RATE_CONTROL_COARSEST = 51

function options<K extends string>(
  labels: Record<K, string>,
): { value: K; label: string }[] {
  return (Object.keys(labels) as K[]).map((value) => ({
    value,
    label: labels[value],
  }))
}

export const CODEC_OPTIONS = options(CODEC_LABEL)

export const RESOLUTION_OPTIONS = options(RESOLUTION_LABEL)

export const DEINTERLACE_OPTIONS = options(DEINTERLACE_LABEL)

export const STATUS_OPTIONS = options(STATUS_LABEL)

export interface EncodeProfileDraft {
  label: string
  codec: EncodeCodec
  resolution: EncodeResolution
  deinterlace: Deinterlace
  rateFactor: number
  quantiser: number
}

export interface EncodeDestinationDraft {
  label: string
  outputRoot: string
  defaultProfileId: string
}

export const PROFILE_DRAFT_DEFAULTS: Omit<EncodeProfileDraft, 'label'> = {
  codec: 'h264',
  resolution: 'asSource',
  deinterlace: 'everyFrame',
  rateFactor: 22,
  quantiser: 24,
}
