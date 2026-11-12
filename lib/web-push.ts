import { browserHere } from '@/lib/device'
import type {
  BrowserPermission,
  DestinationKind,
  NotificationWrite,
  WriteRefusal,
} from '@/lib/notifications'
import { couldNot } from '@/lib/try-again'

/** What a push service hands Carina for one browser: where to send, and the keys the message is sealed with. */
export interface PushSubscriptionDraft {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

/** This browser's subscription, with the server key it was made under where the browser tells it. */
export interface HeldSubscription extends PushSubscriptionDraft {
  serverKey?: string
}

/** A browser row as the renewal reads it. */
export interface BrowserRow {
  id: string
  fingerprint?: string
}

export type BrowserWrite =
  { state: 'ok'; id: string } | { state: 'unauthenticated' } | WriteRefusal

export type PushKeyAnswer =
  | { state: 'ok'; publicKey: string }
  | { state: 'unauthenticated' }
  | WriteRefusal

/** What the browser can be asked: its grant, its worker and its subscription. */
export interface PushHands {
  permission: () => BrowserPermission
  askPermission: () => Promise<BrowserPermission>
  register: () => Promise<void>
  current: () => Promise<HeldSubscription | undefined>
  subscribe: (serverKey: string) => Promise<HeldSubscription>
  unsubscribe: () => Promise<void>
}

/** What Carina is asked through Vela's server. */
export interface PushCarina {
  readKey: () => Promise<PushKeyAnswer>
  add: (
    draft: PushSubscriptionDraft & { name: string },
  ) => Promise<BrowserWrite>
  rows: () => Promise<BrowserRow[] | undefined>
  replace: (id: string, draft: PushSubscriptionDraft) => Promise<BrowserWrite>
}

/** The row this browser added, kept in this browser alone. */
export interface PushMemory {
  recall: () => string | undefined
  remember: (id: string) => void
  forget: () => void
}

/** What the browser's surroundings say about adding it: the features it has, its grant, and where it was opened from. */
export interface PushSurroundings {
  serviceWorker: boolean
  pushManager: boolean
  notification: boolean
  permission: BrowserPermission
  /** An iPhone or iPad, which takes notices only in the Vela added to its home screen. */
  appleTouch: boolean
  standalone: boolean
  publicOriginKnown: boolean
}

export type PushReadiness =
  'ready' | 'denied' | 'unsupported' | 'homeScreenOnly' | 'noPublicOrigin'

export const DENIED_HERE =
  'このブラウザは通知を拒否しています。サイトの設定で許可してください'

export const NO_PUBLIC_ORIGIN_HERE =
  '通知を送るには公開のアドレスの設定が要ります'

export const REASON_OF: Record<PushReadiness, string | undefined> = {
  ready: undefined,
  denied: DENIED_HERE,
  unsupported: 'このブラウザは通知に対応していません',
  homeScreenOnly: 'ホーム画面に追加した Vela から使えます',
  noPublicOrigin: NO_PUBLIC_ORIGIN_HERE,
}

export const NOT_ALLOWED_HERE =
  '通知を許可しなかったため、追加できませんでした。'

const ADDING_FELL = '送り先を追加できませんでした'

export function readinessOf(around: PushSurroundings): PushReadiness {
  if (around.appleTouch && !around.standalone) {
    return 'homeScreenOnly'
  }

  if (!around.serviceWorker || !around.pushManager || !around.notification) {
    return 'unsupported'
  }

  if (around.permission === 'denied') {
    return 'denied'
  }

  return around.publicOriginKnown ? 'ready' : 'noPublicOrigin'
}

const MAC = /\bMacintosh\b/

/** The name this browser is offered under. An iPad's Safari says it is a Mac, and only its touch tells it apart. */
export function hereOf(agent: string, touchPoints: number): string {
  return browserHere(
    touchPoints > 1 && MAC.test(agent) ? agent.replace(MAC, 'iPad') : agent,
  )
}

/** Whether the agent is an iPhone or an iPad, an iPad's Safari saying Mac. */
export function appleTouchOf(agent: string, touchPoints: number): boolean {
  return (
    /\biPhone\b|\biPad\b|\biPod\b/.test(agent) ||
    (touchPoints > 1 && MAC.test(agent))
  )
}

export async function fingerprintOf(
  endpoint: string,
  subtle: SubtleCrypto = globalThis.crypto.subtle,
): Promise<string> {
  const digest = await subtle.digest(
    'SHA-256',
    new TextEncoder().encode(endpoint),
  )

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/** The browser row whose fingerprint is that of this browser's subscription. */
export function ownRowOf(
  rows: readonly { id: string; kind: DestinationKind; fingerprint?: string }[],
  fingerprint: string | undefined,
): string | undefined {
  if (fingerprint === undefined) {
    return undefined
  }

  const wanted = fingerprint.toLowerCase()

  return rows.find(
    (row) =>
      row.kind === 'webPush' && row.fingerprint?.toLowerCase() === wanted,
  )?.id
}

export function base64UrlOf(bytes: Uint8Array): string {
  let text = ''

  for (const byte of bytes) {
    text += String.fromCharCode(byte)
  }

  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function bytesOfBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const plain = text.replace(/=+$/, '').replace(/-/g, '+').replace(/_/g, '/')
  const padded = plain + '='.repeat((4 - (plain.length % 4)) % 4)
  const read = atob(padded)
  const bytes = new Uint8Array(read.length)

  for (let at = 0; at < read.length; at += 1) {
    bytes[at] = read.charCodeAt(at)
  }

  return bytes
}

function sameKey(one: string | undefined, other: string): boolean {
  return (
    one !== undefined && one.replace(/=+$/, '') === other.replace(/=+$/, '')
  )
}

function refusal(message: string): WriteRefusal {
  return { state: 'rejected', message }
}

function draftOf(held: HeldSubscription): PushSubscriptionDraft {
  return { endpoint: held.endpoint, keys: held.keys }
}

async function subscribed(
  hands: PushHands,
  serverKey: string,
): Promise<{ held: HeldSubscription; made: boolean }> {
  await hands.register()

  const existing = await hands.current()

  if (existing && sameKey(existing.serverKey, serverKey)) {
    return { held: existing, made: false }
  }

  if (existing) {
    await hands.unsubscribe()
  }

  return { held: await hands.subscribe(serverKey), made: true }
}

async function givenUp(hands: PushHands): Promise<void> {
  try {
    await hands.unsubscribe()
  } catch {}
}

/** Adds this browser: the prompt is asked first, while the press still counts, and a subscription Carina does not take is given up again. */
export async function addThisBrowser(
  name: string,
  hands: PushHands,
  carina: Pick<PushCarina, 'readKey' | 'add'>,
  memory: PushMemory,
): Promise<NotificationWrite> {
  const granted = await hands.askPermission()

  if (granted !== 'granted') {
    return refusal(granted === 'denied' ? DENIED_HERE : NOT_ALLOWED_HERE)
  }

  let made = false

  try {
    const key = await carina.readKey()

    if (key.state !== 'ok') {
      return key
    }

    const subscription = await subscribed(hands, key.publicKey)

    made = subscription.made

    const written = await carina.add({ name, ...draftOf(subscription.held) })

    if (written.state !== 'ok') {
      if (made) {
        await givenUp(hands)
      }

      return written
    }

    memory.remember(written.id)

    return { state: 'ok' }
  } catch {
    if (made) {
      await givenUp(hands)
    }

    return refusal(couldNot(ADDING_FELL))
  }
}

export type Renewal =
  | { do: 'nothing' }
  | { do: 'adopt'; id: string }
  | { do: 'forget' }
  | { do: 'replace' }
  | { do: 'subscribeAgain' }

/** What opening Vela does about the row this browser remembers, given the browser rows and the fingerprint of its subscription now. */
export function renewalFor({
  remembered,
  rows,
  current,
}: {
  remembered: string
  rows: readonly BrowserRow[] | undefined
  current: string | undefined
}): Renewal {
  if (rows === undefined) {
    return { do: 'nothing' }
  }

  const own =
    current === undefined
      ? undefined
      : rows.find((row) => row.fingerprint?.toLowerCase() === current)

  if (own) {
    return own.id === remembered
      ? { do: 'nothing' }
      : { do: 'adopt', id: own.id }
  }

  if (!rows.some((row) => row.id === remembered)) {
    return { do: 'forget' }
  }

  return current === undefined ? { do: 'subscribeAgain' } : { do: 'replace' }
}

async function forgotten(hands: PushHands, memory: PushMemory): Promise<void> {
  memory.forget()
  await givenUp(hands)
}

async function put(
  id: string,
  held: HeldSubscription,
  hands: PushHands,
  carina: Pick<PushCarina, 'replace'>,
  memory: PushMemory,
): Promise<void> {
  const written = await carina.replace(id, draftOf(held))

  if (written.state === 'rejected' && written.gone) {
    await forgotten(hands, memory)
  }
}

/** Keeps the remembered row on this browser's subscription when Vela opens. It never asks for a grant and never says anything. */
export async function renewThisBrowser(
  hands: PushHands,
  carina: Omit<PushCarina, 'add'>,
  memory: PushMemory,
): Promise<void> {
  try {
    const remembered = memory.recall()

    if (hands.permission() !== 'granted' || remembered === undefined) {
      return
    }

    const [rows, held] = await Promise.all([carina.rows(), hands.current()])
    const current = held ? await fingerprintOf(held.endpoint) : undefined
    const renewal = renewalFor({ remembered, rows, current })

    switch (renewal.do) {
      case 'nothing':
        return
      case 'adopt':
        memory.remember(renewal.id)

        return
      case 'forget':
        await forgotten(hands, memory)

        return
      case 'replace':
        if (held) {
          await put(remembered, held, hands, carina, memory)
        }

        return
      case 'subscribeAgain': {
        const key = await carina.readKey()

        if (key.state !== 'ok') {
          return
        }

        await hands.register()
        await put(
          remembered,
          await hands.subscribe(key.publicKey),
          hands,
          carina,
          memory,
        )

        return
      }
    }
  } catch {}
}
