import type { components } from '@/repository/client/schema'
import type { StationLogo } from '@/repository/channels'

type Carrier = {
  logo?: components['schemas']['StationLogoResponder'] | null
  logoDeclaration?: components['schemas']['StationLogoDeclaration'] | null
}

export function stationLogoOf(service: Carrier): StationLogo {
  const carried = service.logo

  if (carried == null) {
    return {
      declaration:
        service.logoDeclaration === 'noPictureIsBroadcast'
          ? 'noPictureIsBroadcast'
          : 'notYetRead',
    }
  }

  return { declaration: 'inTheCommonDataTable', href: carried.url }
}
