import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  isInFullscreen,
  subscribeToFullscreen,
  type FullscreenDocument,
} from '@/hooks/useFullscreen'

class HandHeldDocument extends EventTarget implements FullscreenDocument {
  fullscreenElement: unknown = null

  show(element: unknown): void {
    this.fullscreenElement = element
    this.dispatchEvent(new Event('fullscreenchange'))
  }
}

const SHELL = {} as Element

const ANOTHER = {} as Element

test('the element is in fullscreen only while the document shows that very element', () => {
  const page = new HandHeldDocument()

  assert.equal(isInFullscreen(SHELL, page), false)

  page.show(SHELL)
  assert.equal(isInFullscreen(SHELL, page), true)
  assert.equal(isInFullscreen(ANOTHER, page), false)

  page.show(null)
  assert.equal(isInFullscreen(SHELL, page), false)
})

test('an element not yet on the page is never in fullscreen, even while nothing is', () => {
  const page = new HandHeldDocument()

  assert.equal(isInFullscreen(null, page), false)
})

test('every change is told until the subscription is let go', () => {
  const page = new HandHeldDocument()
  let told = 0
  const stop = subscribeToFullscreen(() => {
    told += 1
  }, page)

  page.show(SHELL)
  page.show(null)
  assert.equal(told, 2)

  stop()
  page.show(SHELL)
  assert.equal(told, 2)
})
