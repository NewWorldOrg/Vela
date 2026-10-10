'use client'

import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react'

import {
  runtimeMessageFrom,
  type PlayerMessage,
  type RuntimeMessage,
} from '@/lib/bml/messages'
import { RUNTIME_SANDBOX, runtimeDocument } from '@/lib/bml/runtime-document'
import { cn } from '@/lib/utils'
import { RUNTIME_SCRIPT } from '@/components/data-broadcast/runtime-script.generated'

export type SendToRuntime = (
  message: PlayerMessage,
  transfer?: Transferable[],
) => void

function stays(): () => void {
  return () => {}
}

/** The sandboxed frame the data broadcast runtime draws in. It hands the player a way to talk to it once, when the runtime first loads, and passes on only what the runtime may say. A frame that loads a second time has been navigated away from the runtime: nothing more is sent to it or taken from it, and it is said to be broken. */
export function BmlFrame({
  onReady,
  onMessage,
  className,
}: {
  onReady: (send: SendToRuntime) => void
  onMessage: (message: RuntimeMessage) => void
  className?: string
}) {
  const frame = useRef<HTMLIFrameElement>(null)
  const origin = useSyncExternalStore(
    stays,
    () => window.location.origin,
    () => null,
  )
  const source = useMemo(
    () => (origin ? runtimeDocument(origin, RUNTIME_SCRIPT) : null),
    [origin],
  )
  const heard = useEffectEvent(onMessage)
  const loads = useRef(0)

  useEffect(() => {
    const listen = (event: MessageEvent) => {
      if (loads.current !== 1) {
        return
      }

      const message = runtimeMessageFrom(
        { origin: event.origin, source: event.source, data: event.data },
        frame.current?.contentWindow,
      )

      if (message) {
        heard(message)
      }
    }

    window.addEventListener('message', listen)

    return () => window.removeEventListener('message', listen)
  }, [])

  if (!source) {
    return null
  }

  return (
    <iframe
      ref={frame}
      title="データ放送"
      srcDoc={source}
      sandbox={RUNTIME_SANDBOX}
      tabIndex={-1}
      onLoad={() => {
        loads.current += 1

        const runtime = frame.current?.contentWindow

        if (loads.current > 1) {
          onMessage({ kind: 'error', reason: 'malformed' })

          return
        }

        if (runtime) {
          onReady((message, transfer = []) => {
            if (loads.current === 1) {
              runtime.postMessage(message, '*', transfer)
            }
          })
        }
      }}
      className={cn(
        'pointer-events-none absolute inset-0 size-full border-0 [color-scheme:normal]',
        className,
      )}
    />
  )
}
