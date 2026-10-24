import {
  NO_RESIDENCE,
  residenceOf,
  type Residence,
} from '@/lib/bml/receiver-info'

/** Where Carina keeps the receiver's residence, read and changed. */
export const RESIDENCE_PATH = '/api/data-broadcast/settings'

/** The residence from Carina's status and its JSON answer. Anything but a success in the shape it has reads as not registered. */
export function residenceRead(status: number, answer: unknown): Residence {
  const read =
    status === 200
      ? residenceOf((answer as { data?: unknown } | null)?.data)
      : null

  return read ?? NO_RESIDENCE
}
