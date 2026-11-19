import {
  NO_RESIDENCE,
  residenceOf,
  type Residence,
} from '@/lib/bml/receiver-info'

export const RESIDENCE_PATH = '/api/data-broadcast/settings'

export function residenceRead(status: number, answer: unknown): Residence {
  const read =
    status === 200
      ? residenceOf((answer as { data?: unknown } | null)?.data)
      : null

  return read ?? NO_RESIDENCE
}
