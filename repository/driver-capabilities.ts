import type { components } from '@/repository/client/schema'

type SessionPurpose = components['schemas']['SessionPurpose']

/**
 * What holds a tuner, in the words the tuner screen puts in the session
 * column. It lives here rather than beside that screen because the system
 * screen needs the same words for a purpose a driver declares support for,
 * and this module reaches no API — a screen may take a value out of it.
 */
export const SESSION_PURPOSE_LABEL: Record<SessionPurpose, string> = {
  unspecified: '用途不明',
  recording: '録画',
  survey: 'EPG 収集',
  surveyNow: 'EPG 収集（前倒し）',
  live: 'ライブ',
  scan: 'スキャン',
}

/**
 * What each thing a driver declares is called on the screens that use it. The
 * wire names are the contract between two processes and read as one on screen,
 * so every one of them is answered with the word this product already uses:
 * `停止理由` is the recording screen's own row, `スクランブル解除` and
 * `ドロップ発生位置` come from the recording screens, `デバイス検出` from the
 * tuner screen, `保存先` from storage, `CNR` and `post-Viterbi ビット誤り率`
 * are the quality screen's own column headings.
 */
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

/**
 * The two prefixes the contract declares, and what the part after the dot is
 * called. A dotted name is a member of the thing before the dot rather than a
 * thing of its own — `signalQuality.cnr` is one of the figures signal quality
 * is made of — so it is read as the parent, then the member.
 *
 * The two are joined with a slash rather than wrapped in brackets because a
 * member carries its own wording and some of it is already bracketed
 * (`EPG 収集（前倒し）`), which would leave a bracket inside a bracket.
 */
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

/**
 * A driver names one more thing than the app knows about the moment it gains
 * one, and a screen that only knows today's names would drop it. So a name
 * with no word here is shown exactly as it arrived: unreadable is better than
 * absent, and worse than either would be a word made up on its behalf.
 */
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
