'use client'

import { useStoredFlag } from '@/hooks/useStoredFlag'

/**
 * Whether the live screen is folding away the splits that are showing nothing
 * their station is not showing, kept per browser.
 *
 * It is the guide's press asked of a different thing, and so a different value.
 * The guide's fold is read over a whole broadcast day and takes away hours; this
 * one is read over the one programme a card draws and takes away cards, so the
 * same line-up folds on one screen and not on the other at the same moment. One
 * value for the two would mean a press made while reading tonight's listings
 * silently changing what there is to tune to, and a press made here silently
 * changing a day that is not being looked at.
 *
 * It is not in the URL, for the reason the fold of the list beside the picture
 * is not: the channel and the broadcast type are what a second reader opening
 * the link needs, and how many cards one reader is looking at is not. Choosing
 * a channel rewrites the URL, so a fold carried there would go back and forth
 * on every zap.
 */
export const LIVE_SUB_CHANNELS_FOLDED_KEY = 'vela-live-sub-channels-folded'

const SPELLING = { yes: 'folded', no: 'open' }

export function useLiveSubChannelsFolded(): [boolean, (next: boolean) => void] {
  return useStoredFlag(LIVE_SUB_CHANNELS_FOLDED_KEY, SPELLING)
}
