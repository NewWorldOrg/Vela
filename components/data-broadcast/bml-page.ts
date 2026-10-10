import type { BmlPage, PageElement, PageNode } from '@/lib/bml/document'
import { videoHole } from '@/lib/bml/style'

export interface MountedPage {
  body: HTMLElement
  byNavIndex: Map<number, HTMLElement>
}

const HTML_ATTRIBUTES = new Set(['id', 'class', 'value', 'maxlength'])

const RUNTIME_ATTRIBUTES = new Set(['data-bml-href', 'data-bml-video'])

const NAV_ATTRIBUTE: [keyof PageElement['nav'], string][] = [
  ['index', 'data-bml-nav-index'],
  ['up', 'data-bml-nav-up'],
  ['down', 'data-bml-nav-down'],
  ['left', 'data-bml-nav-left'],
  ['right', 'data-bml-nav-right'],
]

function kept(name: string, value: string): boolean {
  if (name === 'src') {
    return value.startsWith('blob:')
  }

  return (
    HTML_ATTRIBUTES.has(name) ||
    RUNTIME_ATTRIBUTES.has(name) ||
    /^data-bml-attr-[a-z][a-z0-9_-]*$/.test(name)
  )
}

function build(
  node: PageNode,
  document: Document,
  byNavIndex: Map<number, HTMLElement>,
): Node {
  if (node.kind === 'text') {
    return document.createTextNode(node.text)
  }

  const element = document.createElement(node.tag)

  element.setAttribute('data-bml-tag', node.bmlTag)
  node.attributes
    .filter(([name, value]) => kept(name, value))
    .forEach(([name, value]) => element.setAttribute(name, value))
  NAV_ATTRIBUTE.forEach(([link, name]) => {
    const value = node.nav[link]

    if (value !== undefined) {
      element.setAttribute(name, String(value))
    }
  })

  if (node.style.length > 0) {
    element.setAttribute('style', node.style)
  }

  if (node.tag === 'input') {
    element.setAttribute('readonly', '')
    element.setAttribute('tabindex', '-1')
  }

  if (node.nav.index !== undefined && !byNavIndex.has(node.nav.index)) {
    byNavIndex.set(node.nav.index, element)
  }

  node.children.forEach((child) =>
    element.append(build(child, document, byNavIndex)),
  )

  return element
}

/** Draws a converted page into the plane, replacing what was there. Nothing of the document becomes an event handler or reaches past `data-bml-*`. */
export function mountPage(page: BmlPage, plane: HTMLElement): MountedPage {
  const document = plane.ownerDocument
  const style = document.createElement('style')
  const byNavIndex = new Map<number, HTMLElement>()
  const body = build(page.body, document, byNavIndex) as HTMLElement

  style.textContent = page.styleSheet
  plane.replaceChildren(style, body)
  plane.style.width = `${page.resolution.width}px`
  plane.style.height = `${page.resolution.height}px`

  if (page.videoRect) {
    body.setAttribute('data-bml-hole', '')
    Object.entries(videoHole(page.videoRect, page.resolution)).forEach(
      ([name, value]) => body.style.setProperty(name, value),
    )
  }

  return { body, byNavIndex }
}
