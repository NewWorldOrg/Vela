'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { cn } from '@/lib/utils'
import { pressable } from '@/components/vela/tactile'

/** How long a toast stays, and how long a deletion it holds back waits before it is sent. */
export const TOAST_MS = 5_000

export interface Toast {
  text: string
  /** The one thing the toast offers: taking back what was just done. */
  action?: { label: string; onPress: () => void }
  /** What happens when the toast leaves without its action pressed: a deletion held back until now is sent. */
  onExpire?: () => void
}

interface Shown extends Toast {
  key: number
}

const Say = createContext<(toast: Toast) => void>(() => undefined)

/** The toast's place: above the tabs at the foot of a phone, at the window's foot elsewhere. One toast at a time; a new one lets the one before leave as if its time had run out. */
export function Toasts({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState<Shown>()
  const standing = useRef<Shown | undefined>(undefined)
  const count = useRef(0)

  const leave = useCallback((expired: boolean) => {
    const was = standing.current

    standing.current = undefined
    setShown(undefined)

    if (expired) {
      was?.onExpire?.()
    }
  }, [])

  const say = useCallback(
    (toast: Toast) => {
      if (standing.current) {
        leave(true)
      }

      count.current += 1

      const next = { ...toast, key: count.current }

      standing.current = next
      setShown(next)
    },
    [leave],
  )

  useEffect(() => {
    if (!shown) {
      return undefined
    }

    const timer = setTimeout(() => leave(true), TOAST_MS)

    return () => clearTimeout(timer)
  }, [shown, leave])

  return (
    <Say.Provider value={say}>
      {children}
      <div
        aria-live="polite"
        className={cn(
          'pointer-events-none fixed inset-x-3 bottom-[calc(max(var(--tab-bar-cover),var(--safe-bottom))+10rem/16)] z-[55] flex justify-center',
          'sideways:right-auto sideways:left-[calc(80rem/16+env(safe-area-inset-left))] sideways:w-[calc((100vw-68rem/16-env(safe-area-inset-left))*0.56-24rem/16)] sideways:justify-start',
          'sideways:[body:has([data-watching])_&]:right-3 sideways:[body:has([data-watching])_&]:left-3 sideways:[body:has([data-watching])_&]:w-auto sideways:[body:has([data-watching])_&]:justify-center',
        )}
      >
        {shown && (
          <div
            key={shown.key}
            data-slot="toast"
            className={cn(
              'appears pointer-events-auto flex h-12 w-fit max-w-[calc(480rem/16)] min-w-0 phone:h-[calc(52rem/16)] phone:w-full items-center gap-4 rounded-[14px] bg-toast pr-2 pl-[18px] text-body text-on-toast shadow-[0_10px_30px_rgba(0,0,0,0.25)]',
            )}
          >
            <span className="min-w-0 flex-1 truncate">{shown.text}</span>
            {shown.action && (
              <button
                type="button"
                onClick={() => {
                  const { action } = shown

                  leave(false)
                  action?.onPress()
                }}
                className={cn(
                  'tap-target flex h-[34px] shrink-0 items-center rounded-sm bg-white/12 px-3.5 font-semibold text-on-toast outline-none focus-visible:shadow-ring dark:bg-black/8',
                  pressable,
                )}
              >
                {shown.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </Say.Provider>
  )
}

/** Puts up a toast: a short line of what was just done, and the press that takes it back. */
export function useToast(): (toast: Toast) => void {
  return useContext(Say)
}
