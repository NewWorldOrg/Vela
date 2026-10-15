import { globalBindingsOf, hidingOn, type Evaluate } from '@/lib/bml/scripts'

/** Where the frame keeps the scope the code being run resolves its names through. A document that names it gets nothing, as the scope hides it. */
export const SCOPE_NAME = '__bmlScope'

interface Caught {
  error: unknown
  any: boolean
}

/** Runs a document's code as a script element written into the frame, which the frame's policy allows and `eval` is not: the code is wrapped in `with` over the scope, so its declarations land on the frame's globals and its names resolve through the scope, and what it writes on the frame's globals by a name the scope hides is kept in the scope. What the script throws is caught from the frame's error event and thrown on. The documents' bindings are the frame's globals that were not there when it began. */
export function frameEvaluator(window: Window & typeof globalThis): Evaluate {
  const catching: Caught[] = []
  const frame = window as unknown as Record<string, unknown>
  const bindings = globalBindingsOf(window, [SCOPE_NAME])
  const hiding = hidingOn(window)

  window.addEventListener('error', (event) => {
    const caught = catching[catching.length - 1]

    if (caught) {
      caught.error = event.error
      caught.any = true
      event.preventDefault()
    }
  })

  const evaluate: Evaluate = (code, scope) => {
    const document = window.document
    const script = document.createElement('script')
    const caught: Caught = { error: undefined, any: false }

    frame[SCOPE_NAME] = scope
    script.textContent = `with (window.${SCOPE_NAME}) {\n${code}\n}`
    catching.push(caught)

    try {
      hiding(scope, () => document.head.append(script))
    } finally {
      catching.pop()
      script.remove()
    }

    if (caught.any) {
      throw caught.error ?? new Error('the script failed')
    }
  }

  evaluate.bindings = () => bindings

  return evaluate
}
