export type BroadcastKind = 'terrestrial' | 'bs' | 'cs110'

export const BROADCAST_KIND_LABEL: Record<BroadcastKind, string> = {
  terrestrial: '地上波',
  bs: 'BS',
  cs110: 'CS110',
}

export const BROADCAST_KIND_ORDER: BroadcastKind[] = [
  'terrestrial',
  'bs',
  'cs110',
]
