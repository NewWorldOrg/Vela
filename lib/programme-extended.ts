export interface ExtendedBlock {
  heading: string
  text: string
}

const CAST_HEADINGS = ['出演', 'キャスト', 'ゲスト', 'ナレーター']

export function extendedBlocksOf(extended: string): ExtendedBlock[] {
  const blocks: ExtendedBlock[] = []

  for (const block of extended.split('\n\n')) {
    const breaks = block.indexOf('\n')

    if (breaks < 0) {
      continue
    }

    const heading = block.slice(0, breaks).trim()
    const text = block
      .slice(breaks + 1)
      .replace(/\s+/g, ' ')
      .trim()

    if (heading !== '' && text !== '') {
      blocks.push({ heading, text })
    }
  }

  return blocks
}

export function castInExtended(extended: string): string[] {
  return extendedBlocksOf(extended)
    .filter((block) =>
      CAST_HEADINGS.some((word) => block.heading.includes(word)),
    )
    .map((block) => block.text)
}

export function leadOfExtended(extended: string): string | undefined {
  return extendedBlocksOf(extended)[0]?.text
}
