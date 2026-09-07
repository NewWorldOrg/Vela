import type { RecordingOutcome } from '@/repository/recordings'
import type { ReservationOutcomeKind } from '@/repository/reservation-outcomes'
import type { ReservationStanding } from '@/repository/reservations'

export interface StateTerm {
  label: string
  explanation: string
}

const FILLED_THE_WINDOW = '録画するはずだった時間を満たして録画が終わった状態。'
const CUT_SHORT =
  '録画は始まったが、録画するはずだった時間を満たさずに終わった状態。'
const NOTHING_KEPT = '録画が残らなかった状態。'
const IN_PROGRESS = '録画が進行中の状態。結果は録画の完了時に確定します。'
const NOTHING_STARTED = '開始時刻を過ぎても録画が始まらなかった予約。'

export const RECORDING_IN_PROGRESS_TERM: StateTerm = {
  label: '録画中',
  explanation: IN_PROGRESS,
}

export const RESERVATION_STANDING_TERMS: Record<
  ReservationStanding,
  StateTerm
> = {
  scheduled: {
    label: 'チューナー確保済み',
    explanation:
      '開始時刻に使うチューナーが、この予約のために確保されている状態。',
  },
  conflict: {
    label: '競合',
    explanation:
      '開始時点でチューナーに空きがなく、この予約は録画されない状態。',
  },
  recording: RECORDING_IN_PROGRESS_TERM,
  cancelled: {
    label: '取消済み',
    explanation:
      '取り消された予約。記録は残り、同じ番組の予約は一覧から復元できます。',
  },
  missed: { label: '撮り逃し', explanation: NOTHING_STARTED },
  complete: { label: '完了', explanation: FILLED_THE_WINDOW },
  truncated: { label: '尻切れ', explanation: CUT_SHORT },
  failed: { label: '失敗', explanation: NOTHING_KEPT },
}

export const RECORDING_OUTCOME_TERMS: Record<RecordingOutcome, StateTerm> = {
  recording: RECORDING_IN_PROGRESS_TERM,
  complete: { label: '完全', explanation: FILLED_THE_WINDOW },
  truncated: { label: '尻切れ', explanation: CUT_SHORT },
  failed: { label: '失敗', explanation: NOTHING_KEPT },
}

export const RESERVATION_OUTCOME_KIND_TERMS: Record<
  ReservationOutcomeKind,
  StateTerm
> = {
  competing: {
    label: '競合',
    explanation: '同じ時間帯にチューナーの空きがなく、録画されなかった予約。',
  },
  missed: { label: '撮り逃し', explanation: NOTHING_STARTED },
  tuneFailure: {
    label: '選局失敗',
    explanation: '選局できず、録画が始まらなかった予約。',
  },
  recordingFailure: {
    label: '録画失敗',
    explanation: '録画は始まったが、録画から失敗が報告された予約。',
  },
}

export const END_UNDECIDED_TERM: StateTerm = {
  label: '終了未定',
  explanation: '番組の終了時刻が放送側で確定していない状態。',
}

export const RESERVATION_RECEPTION_TERM: StateTerm = {
  label: '受信不可',
  explanation: 'このサービスに選局先がないため、録画できない状態。',
}

export const RESERVATION_RECORDING_REMOVED_TERM: StateTerm = {
  label: '録画削除済み',
  explanation: 'この予約からできた録画が、あとから削除された状態。',
}

export const CANDIDATE_UNLOCKED_TERM: StateTerm = {
  label: '受信不可',
  explanation: 'この候補チャンネルで同調できなかった状態。',
}
