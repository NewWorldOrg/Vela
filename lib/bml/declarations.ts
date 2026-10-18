import { parse, type Node } from 'acorn'

interface Declared extends Node {
  id?: (Node & { name: string }) | null
  generator?: boolean
  async?: boolean
}

/** A function declared at the top of a script, by name, and not one of the kinds a receiver's scripts never write. */
function isPlainDeclaration(node: Declared): node is Declared & {
  id: Node & { name: string }
} {
  return (
    node.type === 'FunctionDeclaration' &&
    Boolean(node.id) &&
    !node.generator &&
    !node.async
  )
}

/** A script with the functions declared at its top made into assignments run before the rest of it. The evaluator runs a script inside `with` over the document's scope, and a function declared there binds its name in that block as well, so the functions of one script would go on calling their own by a name a later script declares again; as assignments, every script's functions call the latest by that name, as declarations in one global scope do on a receiver. Each declaration leaves an empty statement in its place, so that the code either side of it stays apart. Code that cannot be read is left as it is. */
export function withGlobalFunctions(code: string): string {
  if (!code.includes('function')) {
    return code
  }

  let declared: (Declared & { id: Node & { name: string } })[]

  try {
    const program = parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'script',
      allowReturnOutsideFunction: true,
    }) as unknown as { body: Declared[] }

    declared = program.body.filter(isPlainDeclaration)
  } catch {
    return code
  }

  if (declared.length === 0) {
    return code
  }

  const assigned = declared.map(
    (node) =>
      `var ${node.id.name} = function ${code.slice(parametersAt(code, node.id.end), node.end)};\n`,
  )
  let rest = ''
  let at = 0

  declared.forEach((node) => {
    rest += `${code.slice(at, node.start)};`
    at = node.end
  })

  return assigned.join('') + rest + code.slice(at)
}

const BEFORE_PARAMETERS = /^(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\n]*\n)*/

/** Where the parameters of a declared function begin, past the spaces and comments that may follow its name. */
function parametersAt(code: string, nameEnd: number): number {
  return (
    nameEnd + (BEFORE_PARAMETERS.exec(code.slice(nameEnd))?.[0].length ?? 0)
  )
}
