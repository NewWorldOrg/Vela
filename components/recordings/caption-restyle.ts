import {
  letterShapeEntries,
  maskEntries,
  readCaptionPng,
  readPalette,
  restyledEntries,
  withEntries,
  type CaptionPng,
} from '@/lib/caption-palette'
import {
  EDGE_OF_HEIGHT,
  edgeOffsets,
  rowBandsOf,
  solidBandOf,
  type PixelRect,
} from '@/lib/caption-pixels'
import { NO_MARGIN, type Margin } from '@/lib/caption-placement'
import { VEIL_OF, type CaptionLook } from '@/lib/caption-style'
import type { CaptionPicture } from '@/lib/live-wire'

/** A caption's picture ready to draw, with what it adds around the caption's own rectangle. */
export interface DrawnCaption {
  image: CanvasImageSource
  margin: Margin
  close: () => void
}

function decoded(png: Uint8Array): Promise<ImageBitmap> {
  return createImageBitmap(new Blob([png.slice()], { type: 'image/png' }))
}

function bitmapDrawn(bitmap: ImageBitmap, margin = NO_MARGIN): DrawnCaption {
  return { image: bitmap, margin, close: () => bitmap.close() }
}

function plane(width: number, height: number) {
  const canvas = document.createElement('canvas')

  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d', { willReadFrequently: true })

  if (!context) {
    throw new Error('no 2d context for a caption')
  }

  return { canvas, context }
}

async function maskOf(read: CaptionPng, entries: Uint8Array) {
  const bitmap = await decoded(withEntries(read, entries))

  try {
    const { context } = plane(read.width, read.height)

    context.drawImage(bitmap, 0, 0)

    const pixels = context.getImageData(0, 0, read.width, read.height).data
    const mask = new Uint8Array(read.width * read.height)

    for (let at = 0; at < mask.length; at += 1) {
      mask[at] = pixels[at * 4 + 3] > 127 ? 1 : 0
    }

    return mask
  } finally {
    bitmap.close()
  }
}

function maskPlane(mask: Uint8Array, width: number, height: number) {
  const { canvas, context } = plane(width, height)
  const pixels = context.createImageData(width, height)

  for (let at = 0; at < mask.length; at += 1) {
    pixels.data[at * 4 + 3] = mask[at] ? 255 : 0
  }

  context.putImageData(pixels, 0, 0)

  return canvas
}

function marginOf(
  rows: PixelRect[],
  width: number,
  height: number,
  edge: { across: number; down: number } | null,
): Margin {
  const across = edge ? Math.ceil(edge.across) : 0
  const down = edge ? Math.ceil(edge.down) : 0

  return {
    left: Math.max(across, ...rows.map((one) => -one.left)),
    top: Math.max(down, ...rows.map((one) => -one.top)),
    right: Math.max(across, ...rows.map((one) => one.left + one.width - width)),
    bottom: Math.max(down, ...rows.map((one) => one.top + one.height - height)),
  }
}

interface Layers {
  read: CaptionPng
  letters: Uint8Array
  shape: Uint8Array | null
  band: Uint8Array | null
  rows: PixelRect[]
  veil: number
  edge: { across: number; down: number } | null
}

async function composed(layers: Layers): Promise<DrawnCaption> {
  const { read, band, rows, veil, edge } = layers
  const margin = marginOf(rows, read.width, read.height, edge)
  const { canvas, context } = plane(
    read.width + margin.left + margin.right,
    read.height + margin.top + margin.bottom,
  )
  const letters = await decoded(withEntries(read, layers.letters))

  context.drawImage(letters, margin.left, margin.top)
  letters.close()

  if (band && veil < 255) {
    const taken = maskPlane(band, read.width, read.height)

    context.globalCompositeOperation = 'destination-out'
    context.drawImage(taken, margin.left, margin.top)
    context.globalCompositeOperation = 'destination-over'
    context.globalAlpha = veil / 255
    context.drawImage(taken, margin.left, margin.top)
    context.globalAlpha = 1
  }

  if (edge && layers.shape) {
    const shape = await decoded(withEntries(read, layers.shape))

    context.globalCompositeOperation = 'destination-over'
    edgeOffsets(edge.across, edge.down).forEach((offset) =>
      context.drawImage(shape, margin.left + offset.x, margin.top + offset.y),
    )
    shape.close()
  }

  if (rows.length > 0) {
    const laid = plane(canvas.width, canvas.height)

    rows.forEach((one) =>
      laid.context.fillRect(
        one.left + margin.left,
        one.top + margin.top,
        one.width,
        one.height,
      ),
    )
    context.globalCompositeOperation = 'destination-over'
    context.globalAlpha = veil / 255
    context.drawImage(laid.canvas, 0, 0)
    context.globalAlpha = 1
  }

  context.globalCompositeOperation = 'source-over'

  return {
    image: canvas,
    margin,
    close: () => {
      canvas.width = 0
    },
  }
}

/** The broadcast's own picture, decoded as it came. */
export async function broadcastCaption(
  picture: CaptionPicture,
): Promise<DrawnCaption | null> {
  try {
    return bitmapDrawn(await decoded(picture.png))
  } catch {
    return null
  }
}

/** A caption's picture in the look chosen (BR-CS-001〜005), or null when its PNG is not a shape this can rewrite, or anything goes wrong on the way: then the broadcast's own is drawn. The palette is rewritten, and pixels are read only to find a solid band, to lay bands behind a caption that has none, and to make the shape an added edge is drawn from. `stretch` is how much wider than tall the canvas's pixel is drawn, and `canvasHeight` the canvas's height, which the edge's thickness follows. */
export async function restyledCaption(
  picture: CaptionPicture,
  look: CaptionLook,
  stretch: number,
  canvasHeight: number,
): Promise<DrawnCaption | null> {
  try {
    const read = readCaptionPng(picture.png, picture)

    if (!read) {
      return null
    }

    const palette = readPalette(read.entries)
    const letters = restyledEntries(read.entries, palette, look)
    const veil = VEIL_OF[look.background]
    const findsBand =
      palette.dark && veil !== null && (veil < 255 || palette.veil === null)
    const band = findsBand
      ? solidBandOf(
          await maskOf(
            read,
            maskEntries(read.entries, palette, (role) => role.kind === 'dark'),
          ),
          read.width,
          read.height,
        )
      : null
    const laysRows =
      veil !== null && veil > 0 && palette.veil === null && band === null
    const rows = laysRows
      ? rowBandsOf(
          await maskOf(
            read,
            maskEntries(read.entries, palette, (_, alpha) => alpha > 0),
          ),
          read.width,
          read.height,
          stretch,
        )
      : []
    const down = Math.max(1, canvasHeight * EDGE_OF_HEIGHT)
    const edge =
      look.edge === 'added' ? { across: down / (stretch || 1), down } : null

    if (!edge && rows.length === 0 && !(band && veil !== null && veil < 255)) {
      return bitmapDrawn(await decoded(withEntries(read, letters)))
    }

    return await composed({
      read,
      letters,
      shape: edge ? letterShapeEntries(palette) : null,
      band,
      rows,
      veil: veil ?? 0,
      edge,
    })
  } catch (error) {
    console.warn('[captions] the caption was drawn as it came', error)

    return null
  }
}
