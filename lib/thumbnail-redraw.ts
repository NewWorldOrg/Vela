export const REDRAWN_AT = 'redrawn'

export function redrawnHref(href: string, at?: number): string {
  if (at === undefined) {
    return href
  }

  return `${href}${href.includes('?') ? '&' : '?'}${REDRAWN_AT}=${at}`
}
