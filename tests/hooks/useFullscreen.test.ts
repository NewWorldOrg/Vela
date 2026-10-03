import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  holdStill,
  isInFullscreen,
  leavesTheFill,
  subscribeToFullscreen,
  switchFullscreen,
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

class Page {
  fullscreenElement: unknown = null
  fullscreenEnabled?: boolean = true
  left = 0

  exitFullscreen(): Promise<void> {
    this.left += 1

    return Promise.resolve()
  }
}

class Shell {
  asked = 0
  readonly answer: 'take' | 'refuse'

  constructor(answer: 'take' | 'refuse') {
    this.answer = answer
  }

  requestFullscreen(): Promise<void> {
    this.asked += 1

    return this.answer === 'take'
      ? Promise.resolve()
      : Promise.reject(new TypeError('not allowed'))
  }
}

class TheWindow {
  filled = false
  told: boolean[] = []

  readonly fill = (filled: boolean): void => {
    this.filled = filled
    this.told.push(filled)
  }
}

const settled = () => new Promise((done) => setTimeout(done, 0))

test('the player goes fullscreen when the page can take it, and the window is left alone', async () => {
  const page = new Page()
  const shell = new Shell('take')
  const view = new TheWindow()

  switchFullscreen(shell, false, view.fill, page)
  await settled()

  assert.equal(shell.asked, 1)
  assert.deepEqual(view.told, [])
})

test('while something is fullscreen, the switch leaves it instead', () => {
  const page = new Page()
  const shell = new Shell('take')
  const view = new TheWindow()

  page.fullscreenElement = shell
  switchFullscreen(shell, false, view.fill, page)

  assert.equal(page.left, 1)
  assert.equal(shell.asked, 0)
  assert.deepEqual(view.told, [])
})

test('while the player fills the window, the switch gives the window back', () => {
  const page = new Page()
  const shell = new Shell('take')
  const view = new TheWindow()

  switchFullscreen(shell, true, view.fill, page)

  assert.equal(shell.asked, 0)
  assert.deepEqual(view.told, [false])
})

test('a page with no element fullscreen fills the window, in the same press', () => {
  const page = new Page()
  const view = new TheWindow()

  switchFullscreen({}, false, view.fill, page)

  assert.deepEqual(view.told, [true])
})

test('a page that says element fullscreen is not allowed fills the window, in the same press', () => {
  const page = new Page()
  const shell = new Shell('take')
  const view = new TheWindow()

  page.fullscreenEnabled = false
  switchFullscreen(shell, false, view.fill, page)

  assert.equal(shell.asked, 0)
  assert.deepEqual(view.told, [true])
})

test('a refused element fullscreen fills the window instead', async () => {
  const page = new Page()
  const shell = new Shell('refuse')
  const view = new TheWindow()

  switchFullscreen(shell, false, view.fill, page)
  await settled()

  assert.equal(shell.asked, 1)
  assert.deepEqual(view.told, [true])
})

test('with no player on the page yet, the press does nothing and throws nothing', () => {
  const page = new Page()
  const view = new TheWindow()

  assert.doesNotThrow(() => switchFullscreen(null, false, view.fill, page))
  assert.deepEqual(view.told, [])
})

test('the page stops scrolling while held, and scrolls as it did once let go', () => {
  const page = { style: { overflow: 'auto' } }
  const letGo = holdStill(page)

  assert.equal(page.style.overflow, 'hidden')

  letGo()
  assert.equal(page.style.overflow, 'auto')
})

test('Escape leaves the filled window, unless something on the page already took it', () => {
  assert.equal(leavesTheFill({ key: 'Escape', defaultPrevented: false }), true)
  assert.equal(leavesTheFill({ key: 'Escape', defaultPrevented: true }), false)
  assert.equal(leavesTheFill({ key: 'f', defaultPrevented: false }), false)
})
