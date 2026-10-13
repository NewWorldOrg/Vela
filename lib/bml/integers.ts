import { parse, type Node } from 'acorn'

interface Edit {
  at: number
  end: number
  text: (render: Render) => string
  order: number
}

type Render = (start: number, end: number) => string

const OPEN = ' Math.trunc('

const DIVIDE_IN_PLACE = ' ((o, k, r) => (o[k] = Math.trunc(o[k] / r())))('

const CLOSING = 0

const OPENING = 1

const REPLACING = 2

interface Shaped extends Node {
  operator?: string
  left?: Shaped
  right?: Shaped
  object?: Shaped
  property?: Shaped
  expression?: Shaped
  computed?: boolean
  name?: string
}

function childrenOf(node: Node): Node[] {
  return Object.values(node).flatMap((value: unknown) =>
    (Array.isArray(value) ? value : [value]).filter(
      (each): each is Node =>
        typeof each === 'object' &&
        each !== null &&
        typeof (each as { type?: unknown }).type === 'string',
    ),
  )
}

function insert(at: number, text: string, order: number): Edit {
  return { at, end: at, text: () => text, order }
}

function replace(at: number, end: number, text: string): Edit {
  return { at, end, text: () => text, order: REPLACING }
}

function unwrapped(node: Shaped): Shaped {
  return node.type === 'ParenthesizedExpression' && node.expression
    ? unwrapped(node.expression)
    : node
}

/** A place that reading twice reads the same and changes nothing: a name, `this`, a literal, or members of them named or indexed by a name or a literal. */
function plain(node: Shaped | undefined): boolean {
  if (!node) {
    return false
  }

  if (node.type === 'ParenthesizedExpression') {
    return plain(node.expression)
  }

  if (node.type !== 'MemberExpression') {
    return ['Identifier', 'ThisExpression', 'Literal'].includes(node.type)
  }

  const key = node.property

  return (
    plain(node.object) &&
    (!node.computed || key?.type === 'Identifier' || key?.type === 'Literal')
  )
}

/** `target /= divisor`, read once and written once: a plain place is read again in place, and any other has its object and key worked out once and handed with the divisor to a function that divides there. */
function dividedInPlace(node: Shaped, code: string): Edit[] {
  const target = node.left as Shaped
  const divisor = node.right as Shaped
  const operator = code.indexOf('/=', target.end)

  if (plain(target)) {
    return [
      {
        at: operator,
        end: operator + 2,
        text: (render) =>
          `= ${OPEN.trimStart()}${render(target.start, target.end)} / (`,
        order: REPLACING,
      },
      insert(node.end, '))', CLOSING),
    ]
  }

  const place = unwrapped(target)
  const object = place.object as Shaped
  const key = place.property as Shaped
  const parens =
    place.start > target.start ? [replace(target.start, place.start, '')] : []
  const keyEdits = place.computed
    ? [
        replace(object.end, key.start, ', '),
        replace(key.end, divisor.start, ', () => ('),
      ]
    : [
        replace(
          object.end,
          divisor.start,
          `, ${JSON.stringify(key.name)}, () => (`,
        ),
      ]

  return [
    insert(target.start, DIVIDE_IN_PLACE, OPENING),
    ...parens,
    ...keyEdits,
    insert(node.end, '))', CLOSING),
  ]
}

function editsOf(node: Shaped, code: string): Edit[] {
  const below = childrenOf(node).flatMap((child) => editsOf(child, code))

  if (node.type === 'BinaryExpression' && node.operator === '/') {
    return [
      insert(node.start, OPEN, OPENING),
      insert(node.end, ')', CLOSING),
      ...below,
    ]
  }

  if (node.type === 'AssignmentExpression' && node.operator === '/=') {
    return [...dividedInPlace(node, code), ...below]
  }

  return below
}

function renderer(code: string, edits: Edit[]): Render {
  const sorted = [...edits].sort((one, other) =>
    one.at === other.at ? one.order - other.order : one.at - other.at,
  )
  const render: Render = (start, end) => {
    let out = ''
    let at = start

    for (const edit of sorted) {
      const inside =
        edit.at >= start &&
        edit.end <= end &&
        !(edit.at === end && edit.order === OPENING) &&
        !(edit.at === start && edit.order === CLOSING)

      if (inside && edit.at >= at) {
        out += code.slice(at, edit.at) + edit.text(render)
        at = edit.end
      }
    }

    return out + code.slice(at, end)
  }

  return render
}

/** A document's code with every division cut to an integer toward zero, as a receiver's script has integers for its only numbers; a division by zero still answers Infinity or NaN. Code that does not parse, or that cannot be rewritten, is given back as it was. */
export function withIntegerDivision(code: string): string {
  try {
    const program = parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'script',
      allowReturnOutsideFunction: true,
      preserveParens: true,
    })
    const edits = editsOf(program, code)

    return edits.length === 0 ? code : renderer(code, edits)(0, code.length)
  } catch {
    return code
  }
}
