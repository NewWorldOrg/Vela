import type { components } from '@/repository/client/schema'

type SessionPurpose = components['schemas']['SessionPurpose']

export const SESSION_PURPOSE_LABEL: Record<SessionPurpose, string> = {
  unspecified: '用途不明',
  recording: '録画',
  survey: 'EPG 収集',
  surveyNow: 'EPG 収集（前倒し）',
  live: 'ライブ',
  scan: 'スキャン',
  logo: 'ロゴ収集',
}

const CAPABILITY_LABEL: Record<string, string> = {
  recording: '録画',
  live: 'ライブ',
  qualityMetering: '品質の計測',
  descrambling: 'スクランブル解除',
  signalQuality: '信号品質',
  sessionStopReason: '停止理由',
  liveTunerToggle: 'チューナーの有効・無効',
  typedTuning: '型付きの選局',
  deviceDetection: 'デバイス検出',
  tunerLedger: 'チューナーの台帳',
  gracefulRestart: 'driver の再起動',
  ccMeasurement: 'CC 計測',
  scrambleMeasurement: 'スクランブル残存の計測',
  dropPositions: 'ドロップ発生位置',
  recordingExtension: '録画の延長',
  storage: '保存先',
  recordingErasure: '録画の削除',
}

const MEMBER_LABEL: Record<string, Record<string, string>> = {
  signalQuality: {
    cnr: 'CNR',
    postViterbiBitError: 'post-Viterbi ビット誤り率',
  },
  sessionPurpose: SESSION_PURPOSE_LABEL,
}

const PARENT_LABEL: Record<string, string> = {
  signalQuality: '信号品質',
  sessionPurpose: 'セッションの目的',
}

export function capabilityLabel(capability: string): string {
  const named = CAPABILITY_LABEL[capability]

  if (named) {
    return named
  }

  const dot = capability.indexOf('.')

  if (dot <= 0 || dot === capability.length - 1) {
    return capability
  }

  const parent = capability.slice(0, dot)
  const member = capability.slice(dot + 1)
  const parentLabel = PARENT_LABEL[parent]

  if (!parentLabel) {
    return capability
  }

  return `${parentLabel} / ${MEMBER_LABEL[parent]?.[member] ?? member}`
}
