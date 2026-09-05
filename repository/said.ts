// The generated client puts a refusal's body under `error`, not `data`.
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
