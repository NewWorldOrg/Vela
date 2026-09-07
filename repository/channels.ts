import type { components } from '@/repository/client/schema'

export type ChannelKind = 'terrestrial' | 'bs' | 'cs110'

export type StationLogoDeclaration =
  components['schemas']['StationLogoDeclaration']

export type StationLogo =
  | {
      declaration: Extract<StationLogoDeclaration, 'inTheCommonDataTable'>
      href: string
    }
  | { declaration: Exclude<StationLogoDeclaration, 'inTheCommonDataTable'> }

export interface Channel {
  id: string
  no: string | undefined
  name: string
  kind: ChannelKind
  sub?: boolean
  whole?: string
  logo?: StationLogo
}

export const CHANNEL_KIND_LABEL: Record<ChannelKind, string> = {
  terrestrial: '地上波',
  bs: 'BS',
  cs110: 'CS110',
}

export const CHANNEL_KIND_ORDER: ChannelKind[] = ['terrestrial', 'bs', 'cs110']

export const CHANNEL_KIND_TAB: Record<ChannelKind, string> = {
  terrestrial: '地上',
  bs: 'BS',
  cs110: 'CS110',
}

export const CHANNEL_KINDS: { value: ChannelKind; label: string }[] =
  CHANNEL_KIND_ORDER.map((value) => ({ value, label: CHANNEL_KIND_TAB[value] }))
