import { BASE_STYLE } from '@/lib/bml/style'

/** The sandbox of the runtime's frame: scripts run, but in an opaque origin of their own. */
export const RUNTIME_SANDBOX = 'allow-scripts'

/** The policy the runtime's document is held to: no network, and only what it is handed. */
export const RUNTIME_POLICY =
  "default-src 'none'; script-src 'unsafe-inline' blob:; img-src blob:; style-src 'unsafe-inline'; connect-src 'none'"

export const PLAYER_ORIGIN_META = 'vela-origin'

export const PLANE_ID = 'bml-plane'

function attribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** The `srcdoc` of the runtime's frame: its policy, the origin it takes messages from, its base style and its script. */
export function runtimeDocument(playerOrigin: string, script: string): string {
  const inline = script.replace(/<\/(script)/gi, '<\\/$1')

  return [
    '<!doctype html>',
    '<html><head><meta charset="utf-8">',
    `<meta http-equiv="Content-Security-Policy" content="${attribute(RUNTIME_POLICY)}">`,
    `<meta name="${PLAYER_ORIGIN_META}" content="${attribute(playerOrigin)}">`,
    `<style>${BASE_STYLE}</style>`,
    `</head><body><div id="${PLANE_ID}"></div><script>${inline}</script></body></html>`,
  ].join('')
}
