export interface BmlAddress {
  tag: number
  module: number
  name: string
  url?: string
}

export const OVER_THE_LINE = -1

export const MOST_URL = 2048

const ON_THE_LINE = /^https?:\/\//i

const ABSOLUTE = /^\/([0-9a-f]{2})\/([0-9a-f]{4})\/([^/]+)$/i

const IN_THE_CAROUSEL = /^~\/([0-9a-f]{4})\/([^/]+)$/i

const BESIDE = /^\.\.\/([0-9a-f]{4})\/([^/]+)$/i

const IN_THE_MODULE = /^(?:\.\/)?([^/:]+)$/

const IN_THIS_SERVICE = /^arib-dc:\/\/-1\.-1\.-1(\/.*)$/i

const MOST_NAME = 255

function named(tag: number, module: string, name: string): BmlAddress | null {
  return name.length > 0 && name.length <= MOST_NAME
    ? { tag, module: parseInt(module, 16), name }
    : null
}

export function addressOf(path: string): BmlAddress | null {
  const absolute = ABSOLUTE.exec(path)

  return absolute
    ? named(parseInt(absolute[1], 16), absolute[2], absolute[3])
    : null
}

function hex(value: number, digits: number): string {
  return value.toString(16).padStart(digits, '0')
}

export function pathOf(address: BmlAddress): string {
  return (
    address.url ??
    `/${hex(address.tag, 2)}/${hex(address.module, 4)}/${address.name}`
  )
}

function withoutFragment(reference: string): string {
  const at = reference.search(/[?#]/)

  return (at < 0 ? reference : reference.slice(0, at)).trim()
}

export function lineAddressOf(
  reference: string,
  base?: string,
): BmlAddress | null {
  let url: URL

  try {
    url = new URL(reference.trim(), base)
  } catch {
    return null
  }

  url.hash = ''

  const href = url.href

  if (!ON_THE_LINE.test(href) || href.length > MOST_URL) {
    return null
  }

  const name = url.pathname.slice(url.pathname.lastIndexOf('/') + 1)

  return { tag: OVER_THE_LINE, module: OVER_THE_LINE, name, url: href }
}

export function locationOf(path: string): BmlAddress | null {
  return ON_THE_LINE.test(path.trim()) ? lineAddressOf(path) : addressOf(path)
}

export function resolveReference(
  reference: string,
  base: BmlAddress,
): BmlAddress | null {
  const plain = withoutFragment(reference)
  const service = IN_THIS_SERVICE.exec(plain)

  if (!service && (base.url !== undefined || ON_THE_LINE.test(plain))) {
    return lineAddressOf(reference, base.url)
  }

  const path = service ? service[1] : plain

  const inCarousel = IN_THE_CAROUSEL.exec(path) ?? BESIDE.exec(path)

  if (inCarousel) {
    return named(base.tag, inCarousel[1], inCarousel[2])
  }

  if (path.startsWith('/')) {
    return addressOf(path)
  }

  const inModule = IN_THE_MODULE.exec(path)

  return inModule ? named(base.tag, hex(base.module, 4), inModule[1]) : null
}

export function streamPathOf(tag: number): string {
  return `/${hex(tag, 2)}`
}

export function modulePathOf(tag: number, module: number): string {
  return `/${hex(tag, 2)}/${hex(module, 4)}`
}

export interface BmlModuleAddress {
  tag: number
  module: number
}

const MODULE_ABSOLUTE = /^\/([0-9a-f]{2})\/([0-9a-f]{4})(?:\/[^/]*)?$/i

const MODULE_IN_THE_CAROUSEL = /^(?:~|\.\.)\/([0-9a-f]{4})(?:\/[^/]*)?$/i

export function moduleAddressOf(
  reference: string,
  base: BmlAddress,
): BmlModuleAddress | null {
  const plain = withoutFragment(reference)
  const service = IN_THIS_SERVICE.exec(plain)
  const path = service ? service[1] : plain
  const absolute = MODULE_ABSOLUTE.exec(path)

  if (absolute) {
    return { tag: parseInt(absolute[1], 16), module: parseInt(absolute[2], 16) }
  }

  const inCarousel = MODULE_IN_THE_CAROUSEL.exec(path)

  return inCarousel
    ? { tag: base.tag, module: parseInt(inCarousel[1], 16) }
    : null
}

const STREAM = /^\/([0-9a-f]{2})(?:\/.*)?$/i

export function streamTagOf(reference: string): number | null {
  const plain = withoutFragment(reference)
  const service = IN_THIS_SERVICE.exec(plain)
  const stream = STREAM.exec(service ? service[1] : plain)

  return stream ? parseInt(stream[1], 16) : null
}
