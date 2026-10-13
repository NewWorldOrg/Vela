import { parse, type Node } from 'acorn'

interface Edit {
  at: number
  end: number
  text: (render: Render) => string
  order: number
}

type Render = (start: number, end: number) => string

const OPEN = 'Math.trunc('

const CLOSING = 0

const OPENING = 1

const REPLACING = 2

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

function editsOf(node: Node, code: string): Edit[] {
  const own = node as Node & {
    operator?: string
    left?: Node
    right?: Node
  }
  const below = childrenOf(node).flatMap((child) => editsOf(child, code))

  if (own.type === 'BinaryExpression' && own.operator === '/') {
    return [
      { at: node.start, end: node.start, text: () => OPEN, order: OPENING },
      { at: node.end, end: node.end, text: () => ')', order: CLOSING },
      ...below,
    ]
  }

  if (
    own.type === 'AssignmentExpression' &&
    own.operator === '/=' &&
    own.left &&
    own.right
  ) {
    const target = own.left
    const at = code.indexOf('/=', target.end)

    return [
      {
        at,
        end: at + 2,
        text: (render) => `= ${OPEN}${render(target.start, target.end)} / (`,
        order: REPLACING,
      },
      { at: node.end, end: node.end, text: () => '))', order: CLOSING },
      ...below,
    ]
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

/** A document's code with every division cut to an integer toward zero, as a receiver's script has integers for its only numbers; code that does not parse is given back as it was. */
export function withIntegerDivision(code: string): string {
  let program: Node

  try {
    program = parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'script',
      allowReturnOutsideFunction: true,
    })
  } catch {
    return code
  }

  const edits = editsOf(program, code)

  return edits.length === 0 ? code : renderer(code, edits)(0, code.length)
}
