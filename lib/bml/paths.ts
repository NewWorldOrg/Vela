export interface BmlAddress {
  tag: number
  module: number
  name: string
}

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

/** The address of an absolute path such as `/40/0000/startup.bml`, or null when it is not one. */
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
  return `/${hex(address.tag, 2)}/${hex(address.module, 4)}/${address.name}`
}

function withoutFragment(reference: string): string {
  const at = reference.search(/[?#]/)

  return (at < 0 ? reference : reference.slice(0, at)).trim()
}

/** Where a reference in a document at `base` points: absolute, `~/` within the carousel, `../` beside the module, or a name within the module. Another service, or a scheme it cannot reach, is null. */
export function resolveReference(
  reference: string,
  base: BmlAddress,
): BmlAddress | null {
  const plain = withoutFragment(reference)
  const service = IN_THIS_SERVICE.exec(plain)
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
