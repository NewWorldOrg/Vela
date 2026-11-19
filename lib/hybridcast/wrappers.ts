import type { Routed } from '@/lib/hybridcast/relay'

export type Route = (written: string | URL) => Routed

const REFUSED = 'Hybridcast: the application may not reach that address'

function addressOf(input: RequestInfo | URL): string | URL {
  return typeof input === 'object' && 'url' in input ? input.url : input
}

export function relayedFetch(native: typeof fetch, route: Route): typeof fetch {
  return (input, init) => {
    const routed = route(addressOf(input))
    const without: RequestInit = { ...init, credentials: 'omit' }

    if (routed.to === 'refused') {
      return Promise.reject(new TypeError(REFUSED))
    }

    if (routed.to === 'browser') {
      return native(input, without)
    }

    return native(
      typeof input === 'object' && 'url' in input
        ? new Request(routed.url, input)
        : routed.url,
      without,
    )
  }
}

export function relayedXhr(
  Native: typeof XMLHttpRequest,
  route: Route,
): typeof XMLHttpRequest {
  return class RelayedXMLHttpRequest extends Native {
    #refused = false

    #ended = false

    #async = true

    open(
      method: string,
      url: string | URL,
      async = true,
      user?: string | null,
      password?: string | null,
    ): void {
      const routed = route(url)

      this.#refused = routed.to === 'refused'
      this.#ended = false
      this.#async = async

      const to = routed.to === 'relay' ? routed.url : String(url)

      super.open(method, this.#refused ? 'data:,' : to, async, user, password)
      super.withCredentials = false
    }

    get withCredentials(): boolean {
      return super.withCredentials
    }

    set withCredentials(_asked: boolean) {
      super.withCredentials = false
    }

    send(body?: Document | XMLHttpRequestBodyInit | null): void {
      if (!this.#refused) {
        super.withCredentials = false
        super.send(body)

        return
      }

      this.#ended = true

      if (!this.#async) {
        throw new DOMException(REFUSED, 'NetworkError')
      }

      setTimeout(() => {
        ;['readystatechange', 'error', 'loadend'].forEach((type) =>
          this.dispatchEvent(new Event(type)),
        )
      }, 0)
    }

    get readyState(): number {
      return this.#ended ? 4 : super.readyState
    }

    get status(): number {
      return this.#ended ? 0 : super.status
    }
  }
}

export function relayedWebSocket(
  Native: typeof WebSocket,
  route: Route,
): typeof WebSocket {
  return class RelayedWebSocket extends Native {
    constructor(url: string | URL, protocols?: string | string[]) {
      const routed = route(url)

      if (routed.to !== 'relay') {
        throw new DOMException(REFUSED, 'SecurityError')
      }

      super(routed.url, protocols)
    }
  }
}

export function relayedBeacon(
  native: (url: string | URL, data?: BodyInit | null) => boolean,
  route: Route,
): (url: string | URL, data?: BodyInit | null) => boolean {
  return (url, data) => {
    const routed = route(url)

    if (routed.to === 'refused') {
      return false
    }

    return native(routed.to === 'relay' ? routed.url : url, data)
  }
}
