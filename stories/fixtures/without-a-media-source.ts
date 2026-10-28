const HLS = 'application/vnd.apple.mpegurl'

/** Takes both media sources away for as long as a story is up, with the video answering about HLS as it is told. */
export function withoutAMediaSource(
  playsHls: CanPlayTypeResult,
  before: () => void = () => {},
): () => () => void {
  return () => {
    const held = window as unknown as Record<string, unknown>
    const sources = ['MediaSource', 'ManagedMediaSource'].map(
      (name) => [name, Object.getOwnPropertyDescriptor(window, name)] as const,
    )
    const canPlayType = Object.getOwnPropertyDescriptor(
      HTMLMediaElement.prototype,
      'canPlayType',
    )

    before()

    for (const [name] of sources) {
      Reflect.deleteProperty(held, name)
    }

    Object.defineProperty(HTMLMediaElement.prototype, 'canPlayType', {
      configurable: true,
      writable: true,
      value: (type: string) => (type === HLS ? playsHls : ''),
    })

    return () => {
      for (const [name, was] of sources) {
        if (was) {
          Object.defineProperty(window, name, was)
        }
      }

      if (canPlayType) {
        Object.defineProperty(
          HTMLMediaElement.prototype,
          'canPlayType',
          canPlayType,
        )
      }
    }
  }
}
