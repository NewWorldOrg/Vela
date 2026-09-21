import type { BroadcastKind } from '@/lib/broadcast-terms'
import {
  BROADCAST_KIND_LABEL,
  BROADCAST_KIND_ORDER,
} from '@/lib/broadcast-terms'
import type { components } from '@/repository/client/schema'

export type ChannelKind = BroadcastKind

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

export const CHANNEL_KIND_LABEL = BROADCAST_KIND_LABEL

export const CHANNEL_KIND_ORDER = BROADCAST_KIND_ORDER

export const CHANNEL_KINDS: { value: ChannelKind; label: string }[] =
  CHANNEL_KIND_ORDER.map((value) => ({
    value,
    label: CHANNEL_KIND_LABEL[value],
  }))
