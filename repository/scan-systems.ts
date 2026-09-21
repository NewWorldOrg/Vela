import { BROADCAST_KIND_LABEL } from '@/lib/broadcast-terms'
import type { components } from '@/repository/client/schema'

type TuneSystem = components['schemas']['TuneSystem']

export type ScanSystem = Exclude<TuneSystem, 'unspecified'>

export const SYSTEM_LABEL: Record<ScanSystem, string> = {
  isdbT: BROADCAST_KIND_LABEL.terrestrial,
  isdbSBs: BROADCAST_KIND_LABEL.bs,
  isdbSCs110: BROADCAST_KIND_LABEL.cs110,
}

export const SCAN_SYSTEMS: { value: ScanSystem; label: string }[] = (
  Object.keys(SYSTEM_LABEL) as ScanSystem[]
).map((value) => ({ value, label: SYSTEM_LABEL[value] }))
