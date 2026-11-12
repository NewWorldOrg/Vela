'use strict'

const APP_NAME = 'Vela'

const ICON = '/pwa/icon-192.png'

function pathToOpen(path, origin) {
  if (typeof path !== 'string' || !/^\/(?![/\\])/.test(path)) {
    return '/'
  }

  try {
    const url = new URL(path, origin)

    return url.origin === origin ? url.pathname + url.search + url.hash : '/'
  } catch {
    return '/'
  }
}

function saidIn(data) {
  try {
    const said = data ? data.json() : undefined

    return said !== null && typeof said === 'object' && !Array.isArray(said)
      ? said
      : {}
  } catch {
    return {}
  }
}

function textOf(value) {
  return typeof value === 'string' ? value : ''
}

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  const said = saidIn(event.data)
  const options = {
    body: textOf(said.body),
    icon: ICON,
    data: { path: pathToOpen(said.path, self.location.origin) },
  }

  if (textOf(said.id) !== '') {
    options.tag = said.id
  }

  event.waitUntil(
    self.registration.showNotification(textOf(said.title) || APP_NAME, options),
  )
})

async function openAt(path) {
  const origin = self.location.origin
  const url = new URL(path, origin).href
  const windows = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })
  const open = windows.find((window) => new URL(window.url).origin === origin)

  if (open) {
    try {
      const focused = await open.focus()
      const led = await (focused || open).navigate(url)

      if (led) {
        return led
      }
    } catch {}
  }

  return self.clients.openWindow(url)
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = event.notification.data

  event.waitUntil(
    openAt(pathToOpen(data ? data.path : undefined, self.location.origin)),
  )
})
