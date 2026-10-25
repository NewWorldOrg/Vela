import type { CaptionCanvas } from '@/lib/live-wire'

export interface Size {
  width: number
  height: number
}

export interface Rect extends Size {
  left: number
  top: number
}

export function containedIn(box: Size, picture: Size): Rect {
  if (
    box.width <= 0 ||
    box.height <= 0 ||
    picture.width <= 0 ||
    picture.height <= 0
  ) {
    return { left: 0, top: 0, width: 0, height: 0 }
  }

  const scale = Math.min(box.width / picture.width, box.height / picture.height)
  const width = picture.width * scale
  const height = picture.height * scale

  return {
    left: (box.width - width) / 2,
    top: (box.height - height) / 2,
    width,
    height,
  }
}

export function placedOn(
  shown: Rect,
  canvas: CaptionCanvas,
  drawn: Rect,
): Rect {
  const across = shown.width / canvas.width
  const down = shown.height / canvas.height

  return {
    left: shown.left + drawn.left * across,
    top: shown.top + drawn.top * down,
    width: drawn.width * across,
    height: drawn.height * down,
  }
}

/** What a restyled picture adds around the caption's own rectangle, in the canvas's pixels. */
export interface Margin {
  left: number
  top: number
  right: number
  bottom: number
}

export const NO_MARGIN: Margin = { left: 0, top: 0, right: 0, bottom: 0 }

export interface CaptionPlacing {
  /** Where the picture is shown, in the box's pixels. */
  shown: Rect
  canvas: CaptionCanvas
  /** Where the caption stands on the canvas. */
  drawn: Rect
  margin?: Margin
  /** The size chosen: 1 is the broadcast's. */
  scale?: number
  /** The move chosen, as fractions of the picture's width and height. */
  shift?: { x: number; y: number }
}

export interface CaptionPlace {
  /** Where the picture that is drawn lands, margin and all. */
  image: Rect
  /** Where the caption's own rectangle lands. */
  caption: Rect
  /** The move once the caption is kept inside the picture. */
  shift: { x: number; y: number }
}

const NEAR_ONE = 1e-9

function scaledAbout(rect: Rect, x: number, y: number, by: number): Rect {
  return {
    left: x + (rect.left - x) * by,
    top: y + (rect.top - y) * by,
    width: rect.width * by,
    height: rect.height * by,
  }
}

function moved(rect: Rect, across: number, down: number): Rect {
  return { ...rect, left: rect.left + across, top: rect.top + down }
}

function keptWithin(
  from: number,
  length: number,
  room: Rect['left'],
  span: number,
) {
  return Math.min(Math.max(from, room), room + span - length) - from
}

function fittingScale(asked: number, image: Rect, shown: Rect): number {
  if (image.width <= 0 || image.height <= 0) {
    return asked
  }

  const fits = Math.min(shown.width / image.width, shown.height / image.height)

  return asked <= fits + NEAR_ONE ? asked : fits
}

/** Where a caption is drawn once it is sized and moved (BR-CS-003). It grows about the middle of its bottom when it stands in the picture's lower half, and of its top when in the upper half; it stops growing where it would leave the picture; the move is added; and what comes out is kept inside the picture. With nothing chosen it lands where the broadcast put it. */
export function captionPlaced({
  shown,
  canvas,
  drawn,
  margin = NO_MARGIN,
  scale = 1,
  shift = { x: 0, y: 0 },
}: CaptionPlacing): CaptionPlace {
  const caption = placedOn(shown, canvas, drawn)
  const across = shown.width / canvas.width
  const down = shown.height / canvas.height
  const image = {
    left: caption.left - margin.left * across,
    top: caption.top - margin.top * down,
    width: caption.width + (margin.left + margin.right) * across,
    height: caption.height + (margin.top + margin.bottom) * down,
  }
  const plain =
    scale === 1 &&
    shift.x === 0 &&
    shift.y === 0 &&
    image.width === caption.width &&
    image.height === caption.height

  if (plain) {
    return { image, caption, shift }
  }

  const by = fittingScale(scale, image, shown)
  const middle = caption.left + caption.width / 2
  const lower = caption.top + caption.height / 2 >= shown.top + shown.height / 2
  const edge = lower ? caption.top + caption.height : caption.top
  const sized = scaledAbout(image, middle, edge, by)
  const asked = moved(sized, shift.x * shown.width, shift.y * shown.height)
  const keptAcross = keptWithin(
    asked.left,
    asked.width,
    shown.left,
    shown.width,
  )
  const keptDown = keptWithin(asked.top, asked.height, shown.top, shown.height)
  const totalAcross = shift.x * shown.width + keptAcross
  const totalDown = shift.y * shown.height + keptDown

  return {
    image: moved(sized, totalAcross, totalDown),
    caption: moved(
      scaledAbout(caption, middle, edge, by),
      totalAcross,
      totalDown,
    ),
    shift: {
      x: shown.width > 0 ? totalAcross / shown.width : 0,
      y: shown.height > 0 ? totalDown / shown.height : 0,
    },
  }
}

/** The room kept between a caption and what it is lifted clear of. */
export const CLEARANCE_GAP = 6

function overlapsAcross(one: Rect, image: Rect): boolean {
  return (
    one.left < image.left + image.width && one.left + one.width > image.left
  )
}

/** How far a caption is lifted to clear what lies over the picture's bottom (D-4): enough for its bottom to stand the gap above the top of everything it would overlap, across and once lifted, but never past the picture's top. */
export function liftClearOf(
  image: Rect,
  shown: Rect,
  over: readonly Rect[],
  gap = CLEARANCE_GAP,
): number {
  const across = over.filter((one) => overlapsAcross(one, image))
  const most = Math.max(0, image.top - shown.top)
  let lift = 0

  for (let round = 0; round <= across.length; round += 1) {
    const top = image.top - lift
    const bottom = top + image.height
    const needed = across
      .filter((one) => one.top < bottom + gap && one.top + one.height > top)
      .reduce((deepest, one) => Math.max(deepest, bottom + gap - one.top), 0)

    if (needed <= 0) {
      break
    }

    lift += needed
  }

  return Math.min(lift, most)
}

/** A CSS cubic Bézier timing curve, as a function of the share of the time gone. */
export function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): (time: number) => number {
  const along = (t: number, a: number, b: number) =>
    3 * a * t * (1 - t) ** 2 + 3 * b * t ** 2 * (1 - t) + t ** 3

  return (time) => {
    if (time <= 0) {
      return 0
    }

    if (time >= 1) {
      return 1
    }

    let low = 0
    let high = 1
    let t = time

    for (let step = 0; step < 30; step += 1) {
      t = (low + high) / 2

      if (along(t, x1, x2) < time) {
        low = t
      } else {
        high = t
      }
    }

    return along(t, y1, y2)
  }
}

/** The control row's own timing (`PLAYER_CHROME_FADE`): it comes up in 250ms easing out, and goes in 100ms easing in. */
export const CLEARANCE_MOTION = {
  rise: { ms: 250, ease: cubicBezier(0, 0, 0.2, 1) },
  fall: { ms: 100, ease: cubicBezier(0.4, 0, 1, 1) },
} as const
