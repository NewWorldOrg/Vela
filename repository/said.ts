/**
 * The sentence the API put in the envelope, wherever the answer landed. The
 * generated client hands the parsed body back under `error` and leaves `data`
 * unset once the status is a refusal, so a sentence looked for under `data`
 * alone is never found on the answers that carry a reason.
 *
 * What comes back is an envelope only where the body parsed as one — a wire
 * that answered with something else answered with no sentence at all.
 */
export function whatItSaid(error: unknown, data?: unknown): string | undefined {
  return sentenceIn(error) ?? sentenceIn(data)
}

function sentenceIn(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null || !('message' in body)) {
    return undefined
  }

  return typeof body.message === 'string' && body.message.length > 0
    ? body.message
    : undefined
}
