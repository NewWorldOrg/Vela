import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  isInFullscreen,
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

class Video {
  entered = 0
  readonly refuses: boolean

  constructor(refuses = false) {
    this.refuses = refuses
  }

  webkitEnterFullscreen(): void {
    if (this.refuses) {
      throw new DOMException('not allowed', 'InvalidStateError')
    }

    this.entered += 1
  }
}

const settled = () => new Promise((done) => setTimeout(done, 0))

test('the player face goes fullscreen when the page can take it, and the picture is left alone', async () => {
  const page = new Page()
  const shell = new Shell('take')
  const video = new Video()

  switchFullscreen(shell, video, page)
  await settled()

  assert.equal(shell.asked, 1)
  assert.equal(video.entered, 0)
})

test('while something is fullscreen, the switch leaves it instead', () => {
  const page = new Page()
  const shell = new Shell('take')
  const video = new Video()

  page.fullscreenElement = shell
  switchFullscreen(shell, video, page)

  assert.equal(page.left, 1)
  assert.equal(shell.asked, 0)
  assert.equal(video.entered, 0)
})

test('a page with no element fullscreen hands the picture its own, in the same press', () => {
  const page = new Page()
  const video = new Video()

  switchFullscreen({}, video, page)

  assert.equal(video.entered, 1)
})

test('a page that says element fullscreen is not allowed hands the picture its own, in the same press', () => {
  const page = new Page()
  const shell = new Shell('take')
  const video = new Video()

  page.fullscreenEnabled = false
  switchFullscreen(shell, video, page)

  assert.equal(shell.asked, 0)
  assert.equal(video.entered, 1)
})

test('a refused element fullscreen still tries the picture its own', async () => {
  const page = new Page()
  const shell = new Shell('refuse')
  const video = new Video()

  switchFullscreen(shell, video, page)
  await settled()

  assert.equal(shell.asked, 1)
  assert.equal(video.entered, 1)
})

test('with neither way there, the press does nothing and throws nothing', async () => {
  const page = new Page()

  assert.doesNotThrow(() => switchFullscreen(null, null, page))
  assert.doesNotThrow(() => switchFullscreen({}, {}, page))
  assert.doesNotThrow(() => switchFullscreen({}, new Video(true), page))
  switchFullscreen(new Shell('refuse'), new Video(true), page)
  await settled()
})
