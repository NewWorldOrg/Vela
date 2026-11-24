import { useState } from 'react'

import {
  appHref,
  takeTheTicket,
  type Handover,
  type PlayerApp,
  type Taken,
} from '@/lib/external-player'

export function ticket(handover: Handover): Promise<Taken> {
  return takeTheTicket(handover, window.location.href)
}

export const WHAT_IS_HANDED = '再生ソース'

export const COPY_THE_URL = 'URL をコピー'

const COPIED = 'URL をコピーしました。'

const NOT_COPIED = 'URL をコピーできませんでした。'

async function asText(taking: Promise<Taken>): Promise<Blob> {
  const got = await taking

  if ('refused' in got) {
    throw new Error(got.refused)
  }

  return new Blob([got.href], { type: 'text/plain' })
}

async function copied(taking: Promise<Taken>): Promise<boolean> {
  try {
    if (typeof ClipboardItem === 'function') {
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/plain': asText(taking) }),
      ])

      return true
    }

    const got = await taking

    if ('refused' in got) {
      return false
    }

    await navigator.clipboard.writeText(got.href)

    return true
  } catch {
    return false
  }
}

export type Said = { tone: 'done' | 'failed'; text: string }

export function useHandingOver() {
  const [taking, setTaking] = useState(false)
  const [said, setSaid] = useState<Said | null>(null)

  const handing = async (
    handover: Handover,
    pass: (taking: Promise<Taken>) => Promise<Said | null>,
  ) => {
    setSaid(null)
    setTaking(true)

    try {
      const asked = ticket(handover)
      const passed = await pass(asked)
      const got = await asked

      setSaid('refused' in got ? { tone: 'failed', text: got.refused } : passed)
    } finally {
      setTaking(false)
    }
  }

  const open = (app: PlayerApp, handover: Handover) =>
    handing(handover, async (asked) => {
      const got = await asked

      if ('href' in got) {
        window.location.assign(appHref(app, got))
      }

      return null
    })

  const copy = (handover: Handover) =>
    handing(handover, async (asked) =>
      (await copied(asked))
        ? { tone: 'done', text: COPIED }
        : { tone: 'failed', text: NOT_COPIED },
    )

  return { taking, said, open, copy }
}
