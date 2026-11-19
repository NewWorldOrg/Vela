import { parse, type Node } from 'acorn'

interface Declared extends Node {
  id?: (Node & { name: string }) | null
  generator?: boolean
  async?: boolean
}

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

function parametersAt(code: string, nameEnd: number): number {
  return (
    nameEnd + (BEFORE_PARAMETERS.exec(code.slice(nameEnd))?.[0].length ?? 0)
  )
}
