import { unstable_rethrow } from 'next/navigation'

import { residenceOf, type Residence } from '@/lib/bml/receiver-info'
import { carinaClient } from '@/repository/client/carina'
import { RESIDENCE_PATH } from '@/repository/residence'
import type { Reading } from '@/repository/system'

export type ResidenceRefusal = 'invalid' | 'unauthenticated' | 'notSaved'

export type ResidenceWrite = { state: 'ok' } | { state: ResidenceRefusal }

const REFUSALS: Partial<Record<number, ResidenceRefusal>> = {
  400: 'invalid',
  401: 'unauthenticated',
}

export async function getResidence(): Promise<Reading<Residence>> {
  try {
    const { data, response } = await carinaClient().GET(RESIDENCE_PATH)

    if (response.status === 401) {
      return { state: 'unauthenticated' }
    }

    const residence = residenceOf(data?.data)

    return residence
      ? { state: 'ok', value: residence }
      : { state: 'unavailable' }
  } catch (error) {
    unstable_rethrow(error)

    return { state: 'unavailable' }
  }
}

/** Registers the postal code and the prefecture together, either of them null for none. */
export async function settleResidence(
  residence: Residence,
): Promise<ResidenceWrite> {
  try {
    const { response } = await carinaClient().PUT(RESIDENCE_PATH, {
      body: {
        postalCode: residence.postalCode,
        prefecture: residence.prefecture,
      },
    })

    if (response.ok) {
      return { state: 'ok' }
    }

    return { state: REFUSALS[response.status] ?? 'notSaved' }
  } catch (error) {
    unstable_rethrow(error)

    return { state: 'notSaved' }
  }
}
