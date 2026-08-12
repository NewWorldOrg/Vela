import { RESERVATIONS, RULES } from '@/repository/reservations.fixtures'

export type ReservationState =
  'secured' | 'conflict' | 'endUndecided' | 'recording'

export interface ConflictEntry {
  title: string
  meta: string
  origin: string
  ruleName?: string
}

export interface Reservation {
  id: string
  title: string
  note?: string
  channelName: string
  channelNo: string
  whenLabel: string
  whenNote?: string
  origin: '手動' | 'ルール'
  ruleName?: string
  state: ReservationState
  stateNote?: string
  conflict?: { headline: string; body: string; entries: ConflictEntry[] }
}

export interface Rule {
  id: string
  name: string
  keywords: string
  excludes?: string
  genres: string[]
  channels: string
  target: string
  enabled: boolean
  matchCount: number
}

export async function listReservations(): Promise<Reservation[]> {
  return RESERVATIONS
}

export async function listRules(): Promise<Rule[]> {
  return RULES
}
