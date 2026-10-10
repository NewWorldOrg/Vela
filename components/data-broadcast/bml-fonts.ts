import type { FontBytes, FontFamily } from '@/lib/bml/messages'

export const FONT_FILES: Record<FontFamily, string> = {
  'Data Broadcast': '/fonts/data-broadcast.woff2',
  'Broadcast Marks': '/fonts/broadcast-marks.woff2',
}

async function bytesOf(family: FontFamily): Promise<FontBytes | null> {
  try {
    const answer = await fetch(FONT_FILES[family])

    return answer.ok ? { family, bytes: await answer.arrayBuffer() } : null
  } catch {
    return null
  }
}

/** The bundled faces as bytes for the runtime, which cannot fetch them itself. A face that cannot be read is left out. */
export async function fontsForTheRuntime(): Promise<FontBytes[]> {
  const fonts = await Promise.all(
    (Object.keys(FONT_FILES) as FontFamily[]).map(bytesOf),
  )

  return fonts.filter((font): font is FontBytes => font !== null)
}
