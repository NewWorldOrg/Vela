import type { components } from '@/repository/client/schema'

type TuneSystem = components['schemas']['TuneSystem']

/** The three systems a scan can walk. `unspecified` never reaches a screen. */
export type ScanSystem = Exclude<TuneSystem, 'unspecified'>

export const SYSTEM_LABEL: Record<ScanSystem, string> = {
  isdbT: '地上波',
  isdbSBs: 'BS',
  isdbSCs110: 'CS110',
}

export const SCAN_SYSTEMS: { value: ScanSystem; label: string }[] = (
  Object.keys(SYSTEM_LABEL) as ScanSystem[]
).map((value) => ({ value, label: SYSTEM_LABEL[value] }))
