'use client'

import { useStoredFlag } from '@/hooks/useStoredFlag'

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

const SPELLING = { yes: 'folded', no: 'open' }

export function useChannelsFolded(): [boolean, (next: boolean) => void] {
  return useStoredFlag(CHANNELS_FOLDED_KEY, SPELLING)
}
