/** What a refusal says when nothing more is known about why: a wording for the reader, never a status code. */
export const TRY_AGAIN_LATER = 'しばらくしてからもう一度試してください。'

/** The whole sentence for a failure that has no lead of its own on the screen. */
export const IT_DID_NOT_WORK = `うまくいきませんでした。${TRY_AGAIN_LATER}`

/** What could not be done, followed by the sentence that says to try again later. */
export function couldNot(what: string): string {
  return `${what.replace(/。$/, '')}。${TRY_AGAIN_LATER}`
}
