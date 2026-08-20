export type DeviceKind =
  'デスクトップ' | 'タブレット' | 'スマートフォン' | '外部プレイヤー'

export interface Device {
  /** What the device is called on screen, e.g. `Chrome / Windows`. */
  name: string
  /** Absent when the string says nothing about what kind of thing it is. */
  kind?: DeviceKind
}

const UNNAMED: Device = { name: '不明な端末' }

interface Platform {
  name: string
  kind: DeviceKind
}

/**
 * A session is labelled with the `User-Agent` the browser sent, which is the
 * only thing the API keeps about the device. It is turned into a name and a
 * kind here, and a version number is only spelled where the string honestly
 * carries one — Windows reports the same build for 10 and 11, and Safari on
 * macOS has reported the same version for years.
 */
export function describeDevice(label: string): Device {
  const agent = label.trim()

  if (agent.length === 0) {
    return UNNAMED
  }

  const platform = platformOf(agent)
  const browser = browserOf(agent)

  if (browser === undefined) {
    return platform === undefined
      ? UNNAMED
      : { name: platform.name, kind: platform.kind }
  }

  return {
    name:
      platform === undefined
        ? browser.name
        : `${browser.name} / ${platform.name}`,
    kind: browser.aBrowser ? platform?.kind : '外部プレイヤー',
  }
}

function platformOf(agent: string): Platform | undefined {
  if (/\biPad\b/.test(agent)) {
    return { name: `iPadOS${appleVersionOf(agent)}`, kind: 'タブレット' }
  }

  if (/\biPhone\b|\biPod\b/.test(agent)) {
    return { name: `iOS${appleVersionOf(agent)}`, kind: 'スマートフォン' }
  }

  const android = /\bAndroid[ /]([0-9]+)/.exec(agent)

  if (android) {
    return {
      name: `Android ${android[1]}`,
      kind: /\bMobile\b/.test(agent) ? 'スマートフォン' : 'タブレット',
    }
  }

  if (/\bWindows NT\b/.test(agent)) {
    return { name: 'Windows', kind: 'デスクトップ' }
  }

  if (/\bMac OS X\b|\bMacintosh\b|\bDarwin\b/.test(agent)) {
    return { name: 'macOS', kind: 'デスクトップ' }
  }

  if (/\bCrOS\b/.test(agent)) {
    return { name: 'ChromeOS', kind: 'デスクトップ' }
  }

  return /\bLinux\b|\bX11\b/.test(agent)
    ? { name: 'Linux', kind: 'デスクトップ' }
    : undefined
}

function appleVersionOf(agent: string): string {
  const version = /\bOS ([0-9]+)[._]/.exec(agent)

  return version ? ` ${version[1]}` : ''
}

interface Browser {
  name: string
  /** A player or a script gets no device kind — it is called what it is. */
  aBrowser: boolean
}

function browserOf(agent: string): Browser | undefined {
  if (/\bEdgA?\//.test(agent)) {
    return { name: 'Edge', aBrowser: true }
  }

  if (/\bOPR\//.test(agent)) {
    return { name: 'Opera', aBrowser: true }
  }

  if (/\bFirefox\/|\bFxiOS\//.test(agent)) {
    return { name: 'Firefox', aBrowser: true }
  }

  if (/\bChrome\/|\bCriOS\//.test(agent)) {
    return { name: 'Chrome', aBrowser: true }
  }

  if (/\bSafari\//.test(agent) && /\bAppleWebKit\//.test(agent)) {
    return { name: 'Safari', aBrowser: true }
  }

  const product = /^([A-Za-z][A-Za-z0-9._-]*)\//.exec(agent)

  return product ? { name: product[1], aBrowser: false } : undefined
}
