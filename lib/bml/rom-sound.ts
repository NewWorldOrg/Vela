/** How many built-in sounds a receiver holds: a document names them `romsound://0` to `romsound://15` (ARIB STD-B24 vol. 2 7.6.9, ARIB TR-B14 vol. 3 3.3.5). */
export const ROM_SOUND_COUNT = 16

const ROM_SOUND_ADDRESS = /^romsound:\/\/(\d{1,2})$/i

export function isRomSound(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    (value as number) >= 0 &&
    (value as number) < ROM_SOUND_COUNT
  )
}

/** The number of the built-in sound a reference names, or null when it names none. */
export function romSoundOf(reference: unknown): number | null {
  const matched =
    typeof reference === 'string'
      ? ROM_SOUND_ADDRESS.exec(reference.trim())
      : null
  const sound = matched ? Number(matched[1]) : null

  return isRomSound(sound) ? sound : null
}
