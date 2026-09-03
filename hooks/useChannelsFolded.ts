'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Whether the channel list on the live screen is folded away, kept per browser.
 *
 * It is not in the URL. What the URL holds is the state a second reader opening
 * the link would need — the channel, the broadcast type — and how wide one
 * reader keeps their own list is not that. Choosing a channel rewrites the URL,
 * so a fold carried there would be re-read on every zap as well.
 *
 * It is remembered because the alternative is a fold that has to be pressed
 * again after every channel: the screen re-reads on each choice, and a fold
 * held only in the render would come back open exactly when the viewer is
 * moving between channels most.
 */
export const CHANNELS_FOLDED_KEY = 'vela-live-channels-folded'

/** This window's own signal, for the other readers of the value in it. */
const CHANGED = 'vela-live-channels-folded-changed'

/**
 * Where the fold is kept when the browser has no store to keep it in. Without
 * this the press would be dead there rather than merely forgetful, which is the
 * worse of the two failures: a control that does nothing.
 */
let unstored: boolean | null = null

function read(): boolean {
  try {
    return window.localStorage.getItem(CHANNELS_FOLDED_KEY) === 'folded'
  } catch (error) {
    console.warn('[useChannelsFolded] read failed', error)

    return unstored ?? false
  }
}

/** The server has no store to read, and a fold is not part of the document. */
function unfolded(): boolean {
  return false
}

function subscribe(onChange: () => void): () => void {
  function fromAnotherTab(event: StorageEvent) {
    if (event.key === CHANNELS_FOLDED_KEY || event.key === null) {
      onChange()
    }
  }

  window.addEventListener(CHANGED, onChange)
  window.addEventListener('storage', fromAnotherTab)

  return () => {
    window.removeEventListener(CHANGED, onChange)
    window.removeEventListener('storage', fromAnotherTab)
  }
}

export function useChannelsFolded(): [boolean, (next: boolean) => void] {
  const folded = useSyncExternalStore(subscribe, read, unfolded)

  const fold = useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(CHANNELS_FOLDED_KEY, next ? 'folded' : 'open')
    } catch (error) {
      console.warn('[useChannelsFolded] write failed', error)

      unstored = next
    }

    window.dispatchEvent(new Event(CHANGED))
  }, [])

  return [folded, fold]
}
