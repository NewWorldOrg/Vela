import type { FontBytes, FontFamily } from '@/lib/bml/messages'

export const FONT_FILES: Record<FontFamily, string> = {
  'Denpa Font': '/fonts/denpa-font.woff2',
}

async function bytesOf(family: FontFamily): Promise<FontBytes | null> {
  try {
    const answer = await fetch(FONT_FILES[family])

    return answer.ok ? { family, bytes: await answer.arrayBuffer() } : null
  } catch {
    return null
  }
}

export async function fontsForTheRuntime(): Promise<FontBytes[]> {
  const fonts = await Promise.all(
    (Object.keys(FONT_FILES) as FontFamily[]).map(bytesOf),
  )

  return fonts.filter((font): font is FontBytes => font !== null)
}
