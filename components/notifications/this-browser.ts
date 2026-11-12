import type { BrowserPermission } from '@/lib/notifications'
import {
  appleTouchOf,
  base64UrlOf,
  bytesOfBase64Url,
  fingerprintOf,
  hereOf,
  type HeldSubscription,
  type PushHands,
  type PushMemory,
  type PushSurroundings,
} from '@/lib/web-push'

const WORKER = '/sw.js'

const REMEMBERED = 'vela-push-destination'

/** The browser the page is open in, as the notification screen reads it. */
export interface ThisBrowser {
  here: string
  around: Omit<PushSurroundings, 'publicOriginKnown'>
  fingerprint?: string
}

function permissionNow(): BrowserPermission {
  return typeof Notification === 'undefined'
    ? 'default'
    : Notification.permission
}

async function registration(): Promise<ServiceWorkerRegistration | undefined> {
  return 'serviceWorker' in navigator
    ? navigator.serviceWorker.getRegistration('/')
    : undefined
}

function heldOf(subscription: PushSubscription): HeldSubscription {
  const { keys } = subscription.toJSON()
  const serverKey = subscription.options.applicationServerKey

  return {
    endpoint: subscription.endpoint,
    keys: { p256dh: keys?.p256dh ?? '', auth: keys?.auth ?? '' },
    serverKey: serverKey ? base64UrlOf(new Uint8Array(serverKey)) : undefined,
  }
}

export const PUSH_HANDS: PushHands = {
  permission: permissionNow,
  askPermission: () => Notification.requestPermission(),
  register: async () => {
    await navigator.serviceWorker.register(WORKER, {
      scope: '/',
      updateViaCache: 'none',
    })
    await navigator.serviceWorker.ready
  },
  current: async () => {
    const held = await (await registration())?.pushManager.getSubscription()

    return held ? heldOf(held) : undefined
  },
  subscribe: async (serverKey) => {
    const { pushManager } = await navigator.serviceWorker.ready

    return heldOf(
      await pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: bytesOfBase64Url(serverKey),
      }),
    )
  },
  unsubscribe: async () => {
    const held = await (await registration())?.pushManager.getSubscription()

    await held?.unsubscribe()
  },
}

export const PUSH_MEMORY: PushMemory = {
  recall: () => {
    try {
      return localStorage.getItem(REMEMBERED) ?? undefined
    } catch {
      return undefined
    }
  },
  remember: (id) => {
    try {
      localStorage.setItem(REMEMBERED, id)
    } catch {}
  },
  forget: () => {
    try {
      localStorage.removeItem(REMEMBERED)
    } catch {}
  },
}

const listeners = new Set<() => void>()

let fingerprint: string | undefined

let fingerprintAsked = false

let kept: ThisBrowser | undefined

function tellEveryone(): void {
  for (const listener of listeners) {
    listener()
  }
}

/** Reads the fingerprint of this browser's subscription again, and tells whoever follows it. */
export async function readTheFingerprint(): Promise<void> {
  try {
    const held = await PUSH_HANDS.current()

    fingerprint = held ? await fingerprintOf(held.endpoint) : undefined
  } catch {
    fingerprint = undefined
  }

  tellEveryone()
}

/** Forgets the row this browser added and gives up its subscription, once that row is removed. */
export async function forgetThisBrowser(): Promise<void> {
  PUSH_MEMORY.forget()

  try {
    await PUSH_HANDS.unsubscribe()
  } catch {}

  await readTheFingerprint()
}

/** Follows this browser: its fingerprint once read, and its grant again whenever the page comes back into view. */
export function followThisBrowser(onChange: () => void): () => void {
  listeners.add(onChange)

  if (!fingerprintAsked) {
    fingerprintAsked = true
    void readTheFingerprint()
  }

  window.addEventListener('focus', onChange)
  document.addEventListener('visibilitychange', onChange)

  return () => {
    listeners.delete(onChange)
    window.removeEventListener('focus', onChange)
    document.removeEventListener('visibilitychange', onChange)
  }
}

function standaloneNow(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** This browser as it is now, the same object while nothing about it changed. */
export function thisBrowserNow(): ThisBrowser {
  const { userAgent, maxTouchPoints } = navigator
  const next: ThisBrowser = {
    here: hereOf(userAgent, maxTouchPoints),
    around: {
      serviceWorker: 'serviceWorker' in navigator,
      pushManager: 'PushManager' in window,
      notification: 'Notification' in window,
      permission: permissionNow(),
      appleTouch: appleTouchOf(userAgent, maxTouchPoints),
      standalone: standaloneNow(),
    },
    fingerprint,
  }

  if (kept && JSON.stringify(kept) === JSON.stringify(next)) {
    return kept
  }

  kept = next

  return kept
}
