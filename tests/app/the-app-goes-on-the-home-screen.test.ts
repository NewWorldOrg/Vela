import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

import manifest from '@/app/manifest'
import {
  DARK_SURFACE,
  LIGHT_BG,
  LIGHT_SURFACE,
  statusBarColours,
} from '@/lib/app-colours'

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)

const read = (file: string) => readFile(path.join(ROOT, file))

function tokenIn(sheet: string, block: string, name: string): string {
  const start = sheet.indexOf(block)
  const found = sheet
    .slice(start)
    .match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'))

  assert.ok(start >= 0 && found, `--${name} is not under ${block}`)

  return found[1].toLowerCase()
}

function pngSize(png: Buffer): { width: number; height: number } {
  assert.equal(png.subarray(1, 4).toString('latin1'), 'PNG')

  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) }
}

test('the manifest opens Vela on its own, from the top', () => {
  const said = manifest()

  assert.equal(said.name, 'Vela')
  assert.equal(said.short_name, 'Vela')
  assert.equal(said.display, 'standalone')
  assert.equal(said.start_url, '/')
  assert.equal(said.scope, '/')
})

test('the colours the manifest and the status bar give are the tokens', async () => {
  const sheet = (await read('app/globals.css')).toString('utf8')

  assert.equal(LIGHT_BG, tokenIn(sheet, ':root {', 'bg'))
  assert.equal(LIGHT_SURFACE, tokenIn(sheet, ':root {', 'surface'))
  assert.equal(DARK_SURFACE, tokenIn(sheet, '@variant dark {', 'surface'))

  const said = manifest()

  assert.equal(said.theme_color, LIGHT_SURFACE)
  assert.equal(said.background_color, LIGHT_BG)
})

test('the status bar follows the theme a person chose', () => {
  assert.deepEqual(statusBarColours('light'), [{ color: LIGHT_SURFACE }])
  assert.deepEqual(statusBarColours('dark'), [{ color: DARK_SURFACE }])
  assert.deepEqual(statusBarColours('system'), [
    { media: '(prefers-color-scheme: light)', color: LIGHT_SURFACE },
    { media: '(prefers-color-scheme: dark)', color: DARK_SURFACE },
  ])
})

test('every icon the manifest names is there, at the size it says', async () => {
  const icons = manifest().icons ?? []

  assert.deepEqual(
    icons.map(({ sizes, purpose }) => `${sizes} ${purpose ?? 'any'}`),
    ['192x192 any', '512x512 any', '512x512 maskable'],
  )

  for (const { src, sizes, type } of icons) {
    assert.equal(type, 'image/png')
    const png = await read(path.join('public', src))
    const { width, height } = pngSize(png)

    assert.equal(`${width}x${height}`, sizes, src)
  }
})

test('the maskable icon and the home screen icon fill their square', async () => {
  for (const file of [
    'public/pwa/icon-maskable-512.png',
    'app/apple-icon.png',
  ]) {
    const png = await read(file)
    const colourType = png.readUInt8(25)

    assert.equal(colourType, 2, `${file} carries transparency`)
  }

  assert.deepEqual(pngSize(await read('app/apple-icon.png')), {
    width: 180,
    height: 180,
  })
})

test('the tab carries the mark, drawn in its small cut', async () => {
  const svg = (await read('app/icon.svg')).toString('utf8')

  assert.match(svg, /stroke-width="21"/)
  assert.doesNotMatch(svg, /stroke-width="16"/)
  assert.match(svg, /prefers-color-scheme:\s*dark/)

  const ico = await read('app/favicon.ico')
  const count = ico.readUInt16LE(4)
  const sizes = Array.from({ length: count }, (_, nth) =>
    ico.readUInt8(6 + nth * 16),
  )

  assert.deepEqual(sizes, [16, 32])
})

test('iPad opens it on its own, below a status bar of its own', async () => {
  const layout = (await read('app/layout.tsx')).toString('utf8')

  assert.match(layout, /appleWebApp: \{\s*capable: true,/)
  assert.match(layout, /'apple-mobile-web-app-capable': 'yes'/)
  assert.match(layout, /statusBarStyle: 'default'/)
  assert.match(layout, /viewportFit: 'cover'/)
  assert.match(layout, /themeColor: statusBarColours\(preference\)/)
})

test('the frame of every screen stays inside the safe area', async () => {
  const shell = (await read('components/vela/app-shell.tsx')).toString('utf8')

  for (const side of ['right', 'bottom', 'left']) {
    assert.match(shell, new RegExp(`env\\(safe-area-inset-${side}\\)`))
  }
  assert.match(
    shell,
    /ADMIN_LIST_HEIGHT_CAP =\s*'max-h-\[calc\(100dvh-66rem\/16-env\(safe-area-inset-bottom\)\)\]'/,
  )
})
