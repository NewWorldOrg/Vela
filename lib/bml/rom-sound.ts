export const ROM_SOUND_COUNT = 16

const ROM_SOUND_ADDRESS = /^romsound:\/\/(\d{1,2})$/i

export function isRomSound(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    (value as number) >= 0 &&
    (value as number) < ROM_SOUND_COUNT
  )
}

export function romSoundOf(reference: unknown): number | null {
  const matched =
    typeof reference === 'string'
      ? ROM_SOUND_ADDRESS.exec(reference.trim())
      : null
  const sound = matched ? Number(matched[1]) : null

  return isRomSound(sound) ? sound : null
}
