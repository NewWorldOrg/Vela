import type { Rect, Size } from '@/lib/caption-placement'
import type { BmlPage, PageElement, PageNode } from '@/lib/bml/document'
import { stillCut, videoHole } from '@/lib/bml/style'

export interface MountedPage {
  body: HTMLElement
  byNavIndex: Map<number, HTMLElement>
  byId: Map<string, HTMLElement>
  nodes: Map<HTMLElement, PageElement>
  states: HTMLStyleElement
}

interface Building {
  document: Document
  byNavIndex: Map<number, HTMLElement>
  byId: Map<string, HTMLElement>
  nodes: Map<HTMLElement, PageElement>
  count: number
}

const HTML_ATTRIBUTES = new Set(['id', 'class', 'value', 'maxlength'])

const RUNTIME_ATTRIBUTES = new Set([
  'data-bml-href',
  'data-bml-ref',
  'data-bml-still',
  'data-bml-video',
])

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

function cutStill(element: HTMLElement, cut: Rect | null): void {
  if (!cut) {
    element.removeAttribute('data-bml-still')

    return
  }

  element.setAttribute('data-bml-still', '')
  Object.entries(stillCut(cut)).forEach(([name, value]) =>
    element.style.setProperty(name, value),
  )
}

function cutHole(body: HTMLElement, rect: Rect | null, resolution: Size): void {
  if (!rect) {
    body.removeAttribute('data-bml-hole')

    return
  }

  body.setAttribute('data-bml-hole', '')
  Object.entries(videoHole(rect, resolution)).forEach(([name, value]) =>
    body.style.setProperty(name, value),
  )
}

export function moveVideo(
  page: BmlPage,
  mounted: MountedPage,
  rect: Rect | null,
): void {
  const first = page.videoRect

  cutHole(mounted.body, rect, page.resolution)
  mounted.nodes.forEach((node, element) => {
    if (node.cut && first) {
      cutStill(
        element,
        rect && {
          left: rect.left - first.left + node.cut.left,
          top: rect.top - first.top + node.cut.top,
          width: rect.width,
          height: rect.height,
        },
      )
    }
  })
}

function build(node: PageNode, building: Building): Node {
  const { document, byNavIndex, byId, nodes } = building

  if (node.kind === 'text') {
    return document.createTextNode(node.text)
  }

  const element = document.createElement(node.tag)
  const id = node.attributes.find(([name]) => name === 'id')?.[1]

  element.setAttribute('data-bml-tag', node.bmlTag)
  element.setAttribute('data-bml-n', String(building.count))
  building.count += 1
  nodes.set(element, node)

  if (id !== undefined && !byId.has(id)) {
    byId.set(id, element)
  }
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

  if (node.cut) {
    cutStill(element, node.cut)
  }

  if (node.tag === 'input') {
    element.setAttribute('readonly', '')
    element.setAttribute('tabindex', '-1')
  }

  if (node.nav.index !== undefined && !byNavIndex.has(node.nav.index)) {
    byNavIndex.set(node.nav.index, element)
  }

  node.children.forEach((child) => element.append(build(child, building)))

  return element
}

export function mountPage(page: BmlPage, plane: HTMLElement): MountedPage {
  const document = plane.ownerDocument
  const style = document.createElement('style')
  const states = document.createElement('style')
  const building: Building = {
    document,
    byNavIndex: new Map(),
    byId: new Map(),
    nodes: new Map(),
    count: 0,
  }
  const body = build(page.body, building) as HTMLElement

  style.textContent = page.styleSheet
  plane.replaceChildren(style, states, body)
  plane.style.width = `${page.resolution.width}px`
  plane.style.height = `${page.resolution.height}px`

  cutHole(body, page.videoRect, page.resolution)

  return {
    body,
    byNavIndex: building.byNavIndex,
    byId: building.byId,
    nodes: building.nodes,
    states,
  }
}
