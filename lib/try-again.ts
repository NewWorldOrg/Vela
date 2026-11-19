export const TRY_AGAIN_LATER = '時間をおいてからもう一度お試しください。'

export const IT_DID_NOT_WORK = `うまくいきませんでした。${TRY_AGAIN_LATER}`

export function couldNot(what: string): string {
  return `${what.replace(/。$/, '')}。${TRY_AGAIN_LATER}`
}
