import type { StationLogo } from '@/repository/channels'

const DARK_INK =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAYCAMAAAClZq98AAAABlBMVEUAAAArKytLsxTnAAAAAnRSTlMA/1uRIrUAAAAkSURBVHjaY2AYlIARDNBpBBhIRUQ5nEzfDR5FRDl8yMTdoAMAW64BXVAm5XcAAAAASUVORK5CYII='

const SOLID_BLOCK =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAYCAMAAAClZq98AAAACVBMVEUAAACqACL///8xYZrvAAAAA3RSTlMA//9EUNYhAAAAI0lEQVR42mNgJAIwDFZFTGAAo1F5A60IxkawRhXRRtFQTL4AsYEEYfWC1LoAAAAASUVORK5CYII='

const FULL_COLOUR =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAYCAMAAAClZq98AAAAD1BMVEUAAAAAVar/qgAAqlX///9MpaVJAAAABXRSTlMA/////xzQJlIAAAAjSURBVHjaY2CgM2BEAAYmOGBgRoChrogFJxgOioZv3NEVAAAKIgXRB/im0AAAAABJRU5ErkJggg=='

const WIDER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAkCAMAAAAO0sygAAAACVBMVEUAAAAbT3r//fiYv0XLAAAAA3RSTlMA//9EUNYhAAAAMUlEQVR42mNgGASAkQIwagB1DWBCAuh8bGDUgCFhAMXpYNSA0cw0Ug0YrRcG1oABBgCeFgoxnoNtzAAAAABJRU5ErkJggg=='

export const LOGO_DARK_INK: StationLogo = {
  declaration: 'inTheCommonDataTable',
  href: DARK_INK,
}

export const LOGO_SOLID_BLOCK: StationLogo = {
  declaration: 'inTheCommonDataTable',
  href: SOLID_BLOCK,
}

export const LOGO_FULL_COLOUR: StationLogo = {
  declaration: 'inTheCommonDataTable',
  href: FULL_COLOUR,
}

export const LOGO_WIDER: StationLogo = {
  declaration: 'inTheCommonDataTable',
  href: WIDER,
}

export const LOGO_UNREADABLE: StationLogo = {
  declaration: 'inTheCommonDataTable',
  href: 'data:image/png;base64,AAAA',
}

export const LOGO_NONE_BROADCAST: StationLogo = {
  declaration: 'noPictureIsBroadcast',
}

export const LOGO_NOT_YET_READ: StationLogo = {
  declaration: 'notYetRead',
}
