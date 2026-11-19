const FULL_WIDTH_ASCII = /[\uFF01-\uFF5E\u3000]/g

const IDEOGRAPHIC_SPACE = '\u3000'

const FULL_TO_HALF = 0xfee0

export function halfWidthOf(text: string): string {
  return text.replace(FULL_WIDTH_ASCII, (c) =>
    c === IDEOGRAPHIC_SPACE
      ? ' '
      : String.fromCharCode(c.charCodeAt(0) - FULL_TO_HALF),
  )
}

export function genreWordOf(label: string): string {
  return label.split('/')[0] ?? label
}
