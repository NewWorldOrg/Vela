import type { ReservationOutcomeKind } from '@/repository/reservation-outcomes'

export interface OutcomeChoice {
  value: string
  label: string
}

export const OUTCOME_KINDS: ReservationOutcomeKind[] = [
  'competing',
  'missed',
  'tuneFailure',
  'recordingFailure',
]

export const OUTCOME_SPANS: OutcomeChoice[] = [
  { value: '7', label: '過去 7 日' },
  { value: '30', label: '過去 30 日' },
  { value: '90', label: '過去 90 日' },
]
