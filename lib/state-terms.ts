import type { RecordingOutcome } from '@/repository/recordings'
import type { ReservationStanding } from '@/repository/reservations'

/**
 * A state word and the condition it stands for. The word is the one the
 * requirements settled on and is not softened here; the explanation says what
 * has to be true for the word to be on screen, so a reader meeting it for the
 * first time is not left to guess from the colour.
 *
 * The word alone still carries the state — SPEC's dot is decorative and the
 * text is the meaning — so nothing that is only in an explanation is
 * information the screen owes anybody.
 */
export interface StateTerm {
  label: string
  explanation: string
}

/** Said the same way in both places the two overlap, so the pair reads as one. */
const FILLED_THE_WINDOW = '録画するはずだった時間を満たして録画が終わった状態。'
const CUT_SHORT =
  '録画は始まったが、録画するはずだった時間を満たさずに終わった状態。'
const NOTHING_KEPT = '録画が残らなかった状態。'
const IN_PROGRESS = '録画が進行中の状態。結果は録画の完了時に確定します。'

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
  recording: { label: '録画中', explanation: IN_PROGRESS },
  cancelled: {
    label: '取消済み',
    explanation:
      '取り消された予約。記録は残り、同じ番組の予約は一覧から復元できます。',
  },
  missed: {
    label: '撮り逃し',
    explanation: '開始時刻を過ぎても録画が始まらなかった予約。',
  },
  complete: { label: '完了', explanation: FILLED_THE_WINDOW },
  truncated: { label: '尻切れ', explanation: CUT_SHORT },
  failed: { label: '失敗', explanation: NOTHING_KEPT },
}

export const RECORDING_OUTCOME_TERMS: Record<RecordingOutcome, StateTerm> = {
  recording: { label: '録画中', explanation: IN_PROGRESS },
  complete: { label: '完全', explanation: FILLED_THE_WINDOW },
  truncated: { label: '尻切れ', explanation: CUT_SHORT },
  failed: { label: '失敗', explanation: NOTHING_KEPT },
}

/**
 * The marks that sit beside a standing. None of them is a standing nor any
 * other's alternative, so they are here rather than in the record above.
 */
export const END_UNDECIDED_TERM: StateTerm = {
  label: '終了未定',
  explanation: '番組の終了時刻が放送側で確定していない状態。',
}

export const RESERVATION_RECEPTION_TERM: StateTerm = {
  label: '受信不可',
  explanation: 'このサービスに選局先がないため、録画できない状態。',
}

/**
 * The third mark, and the same shape as the two above: the reservation is still
 * in the standing its recording left it in, and whether that recording is still
 * kept is a separate thing from which standing it reached.
 */
export const RESERVATION_RECORDING_REMOVED_TERM: StateTerm = {
  label: '録画削除済み',
  explanation: 'この予約からできた録画が、あとから削除された状態。',
}

/**
 * The same word on the channel screen names a different condition, which is
 * the reason it carries an explanation there too rather than being read across
 * from the reservation screen.
 */
export const CANDIDATE_UNLOCKED_TERM: StateTerm = {
  label: '受信不可',
  explanation: 'この候補チャンネルで同調できなかった状態。',
}
