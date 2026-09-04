/**
 * The input that asks the browser for a picture it is already holding one
 * answer for.
 *
 * The API answers the picture of a recording at one path and asks the browser
 * to hold it for a minute (`private, max-age=60`). A picture drawn again is a
 * new answer at that same path, so a `<video>` poster and a row in the library
 * would both go on showing the frame that has just been replaced. The moment
 * of the press is put on the URL instead, which is a URL the browser holds no
 * answer for.
 *
 * Nothing upstream reads it. The API takes no such input, and the relay carries
 * only the inputs its three surfaces take, so this one stops at the browser —
 * which is the only thing it is addressed to.
 */
export const REDRAWN_AT = 'redrawn'

/** The picture, as it stands after the moment given. */
export function redrawnHref(href: string, at?: number): string {
  if (at === undefined) {
    return href
  }

  return `${href}${href.includes('?') ? '&' : '?'}${REDRAWN_AT}=${at}`
}
