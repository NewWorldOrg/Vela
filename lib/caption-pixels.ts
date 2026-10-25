/** What a solid band is held to, against the black edges of letters that also touch the picture's border. */
const BAND = {
  /** Its height, as a part of the picture's, at least. */
  ofThePicture: 0.3,
  /** Its height in pixels at least. */
  rows: 8,
  /** Its width over its height at least. */
  wide: 0.8,
  /** How much of its own rectangle it fills at least: letters take a share of a band, while an edge is a thin line around them. */
  fills: 0.55,
} as const

export interface PixelRect {
  left: number
  top: number
  width: number
  height: number
}

interface Region {
  count: number
  left: number
  top: number
  right: number
  bottom: number
}

function regionFrom(
  dark: Uint8Array,
  label: Int32Array,
  width: number,
  height: number,
  start: number,
  name: number,
  stack: Int32Array,
): Region {
  const region = { count: 0, left: width, top: height, right: -1, bottom: -1 }
  const last = dark.length - width
  let depth = 1

  label[start] = name
  stack[0] = start

  const reach = (next: number) => {
    if (dark[next] === 1 && label[next] === 0) {
      label[next] = name
      stack[depth] = next
      depth += 1
    }
  }

  while (depth > 0) {
    depth -= 1

    const at = stack[depth]
    const x = at % width

    region.count += 1
    region.left = Math.min(region.left, x)
    region.right = Math.max(region.right, x)
    region.top = Math.min(region.top, (at - x) / width)
    region.bottom = Math.max(region.bottom, (at - x) / width)

    if (x > 0) {
      reach(at - 1)
    }

    if (x < width - 1) {
      reach(at + 1)
    }

    if (at >= width) {
      reach(at - width)
    }

    if (at < last) {
      reach(at + width)
    }
  }

  return region
}

function isBand(region: Region, height: number): boolean {
  const across = region.right - region.left + 1
  const down = region.bottom - region.top + 1

  return (
    down >= Math.max(BAND.rows, height * BAND.ofThePicture) &&
    across >= down * BAND.wide &&
    region.count >= across * down * BAND.fills
  )
}

function borderPixels(width: number, height: number): number[] {
  const border: number[] = []

  for (let x = 0; x < width; x += 1) {
    border.push(x, (height - 1) * width + x)
  }

  for (let y = 1; y < height - 1; y += 1) {
    border.push(y * width, y * width + width - 1)
  }

  return border
}

/** The pixels of a solid band (BR-CS-002), from a mask of the opaque black pixels: the regions of them that reach the picture's border and are shaped like a band, wide, tall and mostly filled. A picture cut to its opaque pixels has its band on its border, while the black edges of letters only touch it here and there. Null when there is no such region. */
export function solidBandOf(
  dark: Uint8Array,
  width: number,
  height: number,
): Uint8Array | null {
  if (width <= 0 || height <= 0 || dark.length !== width * height) {
    return null
  }

  const label = new Int32Array(dark.length)
  const stack = new Int32Array(dark.length)
  const bands: boolean[] = [false]
  let name = 0

  for (const start of borderPixels(width, height)) {
    if (!dark[start] || label[start] !== 0) {
      continue
    }

    name += 1

    bands.push(
      isBand(
        regionFrom(dark, label, width, height, start, name, stack),
        height,
      ),
    )
  }

  if (!bands.includes(true)) {
    return null
  }

  const band = new Uint8Array(dark.length)

  for (let at = 0; at < label.length; at += 1) {
    band[at] = bands[label[at]] ? 1 : 0
  }

  return band
}

function linesOf(
  shown: Uint8Array,
  width: number,
  height: number,
): Array<[number, number]> {
  const lines: Array<[number, number]> = []
  let from = -1

  for (let y = 0; y <= height; y += 1) {
    const inked =
      y < height && shown.subarray(y * width, y * width + width).includes(1)

    if (inked && from === -1) {
      from = y
    } else if (!inked && from !== -1) {
      lines.push([from, y])
      from = -1
    }
  }

  return lines
}

function stretchesOf(
  shown: Uint8Array,
  width: number,
  line: [number, number],
  apart: number,
): Array<[number, number]> {
  const stretches: Array<[number, number]> = []

  for (let x = 0; x < width; x += 1) {
    let inked = false

    for (let y = line[0]; y < line[1] && !inked; y += 1) {
      inked = shown[y * width + x] === 1
    }

    if (!inked) {
      continue
    }

    const last = stretches[stretches.length - 1]

    if (last && x - last[1] <= apart) {
      last[1] = x + 1
    } else {
      stretches.push([x, x + 1])
    }
  }

  return stretches
}

/** The bands to lay behind a caption that has none (BR-CS-002): one rectangle for each stretch of each line, from a mask of the pixels that show. Lines are the runs of rows with anything in them; within a line, stretches further apart than one and a half times the line's height become rectangles of their own, so nothing is painted between two places far apart. `stretch` is how much wider a pixel is drawn than it is tall, so the margins look even once drawn. */
export function rowBandsOf(
  shown: Uint8Array,
  width: number,
  height: number,
  stretch: number,
): PixelRect[] {
  if (width <= 0 || height <= 0 || shown.length !== width * height) {
    return []
  }

  const across = 1 / (stretch > 0 ? stretch : 1)

  return linesOf(shown, width, height).flatMap((line) => {
    const tall = line[1] - line[0]
    const marginDown = Math.max(1, Math.round(tall * 0.15))
    const marginAcross = Math.max(1, Math.round(marginDown * across))

    return stretchesOf(shown, width, line, tall * 1.5 * across).map(
      ([from, to]) => ({
        left: from - marginAcross,
        top: line[0] - marginDown,
        width: to - from + marginAcross * 2,
        height: tall + marginDown * 2,
      }),
    )
  })
}

/** The share of the canvas's height an added edge is thick: three pixels on a 1080-line canvas. */
export const EDGE_OF_HEIGHT = 0.0028

/** Where the letters' shape is laid, around them, to make an edge `across` pixels wide and `down` pixels tall: two rings, so the edge is whole. */
export function edgeOffsets(
  across: number,
  down: number,
): Array<{ x: number; y: number }> {
  const rings = down > 1.5 ? [1, 0.5] : [1]
  const steps = 16

  return rings.flatMap((ring) =>
    Array.from({ length: steps }, (_, step) => {
      const angle = (step / steps) * Math.PI * 2

      return {
        x: Math.cos(angle) * across * ring,
        y: Math.sin(angle) * down * ring,
      }
    }),
  )
}
