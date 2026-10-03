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
