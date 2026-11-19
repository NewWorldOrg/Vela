import { globalBindingsOf, hidingOn, type Evaluate } from '@/lib/bml/scripts'

export const SCOPE_NAME = '__bmlScope'

interface Caught {
  error: unknown
  any: boolean
}

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
