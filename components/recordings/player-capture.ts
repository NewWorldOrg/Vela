import { CAPTURED_TYPE } from '@/lib/player-capture'

export type Captured = 'saved' | 'refused'

export type PaintOver = (
  context: CanvasRenderingContext2D,
  size: { width: number; height: number },
) => void

export interface CaptureAsk {
  video: HTMLVideoElement | null
  name: string
  over?: PaintOver
}

export type TakeCapture = (ask: CaptureAsk) => Promise<Captured>

// Not at once: a browser may not have begun reading the blob when the press
// returns, and a URL revoked under it hands the viewer nothing.
const REVOKED_AFTER_MS = 10_000

function readable(context: CanvasRenderingContext2D): boolean {
  try {
    context.getImageData(0, 0, 1, 1)

    return true
  } catch {
    return false
  }
}

function encoded(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), CAPTURED_TYPE)
    } catch {
      resolve(null)
    }
  })
}

function handOver(blob: Blob, name: string): void {
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = href
  link.download = name
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(href), REVOKED_AFTER_MS)
}

export async function drawCapture({
  video,
  over,
}: Omit<CaptureAsk, 'name'>): Promise<Blob | null> {
  if (
    !video ||
    video.readyState < video.HAVE_CURRENT_DATA ||
    video.videoWidth === 0 ||
    video.videoHeight === 0
  ) {
    return null
  }

  const canvas = document.createElement('canvas')

  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  const context = canvas.getContext('2d')

  if (!context) {
    return null
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height)
  over?.(context, { width: canvas.width, height: canvas.height })

  if (!readable(context)) {
    return null
  }

  return encoded(canvas)
}

export const takeCapture: TakeCapture = async ({ video, name, over }) => {
  const blob = await drawCapture({ video, over })

  if (!blob) {
    return 'refused'
  }

  handOver(blob, name)

  return 'saved'
}

export const SAID_CAPTURED = 'キャプチャを保存しました'

export const SAID_NOT_CAPTURED = 'この映像は保存できません'
