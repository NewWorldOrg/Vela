import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'

import {
  followStoredText,
  readStoredText,
  storeText,
} from '@/hooks/useStoredText'

const ACROSS_TABS = 'vela-stored-flag'

function aPage(t: TestContext, { keepsCookies }: { keepsCookies: boolean }) {
  let jar = ''

  Object.assign(globalThis, {
    window: new EventTarget(),
    document: {
      get cookie() {
        return jar
      },
      set cookie(written: string) {
        if (keepsCookies) {
          jar = written.split(';')[0]
        }
      },
    },
  })
  t.mock.method(console, 'warn', () => {})
}

function delivered(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 30))
}

test('where the browser refuses the cookie, a value set stays for the page, though the page hears its own word to the other tabs', async (t) => {
  aPage(t, { keepsCookies: false })

  let told = 0
  const stop = followStoredText('refused-here', () => {
    told += 1
  })

  t.after(stop)
  storeText('refused-here', 'bn')
  await delivered()

  assert.equal(readStoredText('refused-here', undefined), 'bn')
  assert.equal(told, 1)
})

test('where the browser refuses the cookie, taking a value away stays taken away', async (t) => {
  aPage(t, { keepsCookies: false })

  const stop = followStoredText('taken-here', () => {})

  t.after(stop)
  storeText('taken-here', undefined)
  await delivered()

  assert.equal(readStoredText('taken-here', 'bs'), undefined)
})

test('another tab’s word sets aside what this page kept for itself, and is heard', async (t) => {
  aPage(t, { keepsCookies: false })

  let told = 0
  const stop = followStoredText('set-elsewhere', () => {
    told += 1
  })
  const elsewhere = new BroadcastChannel(ACROSS_TABS)

  t.after(() => {
    stop()
    elsewhere.close()
  })
  storeText('set-elsewhere', 'bn')
  await delivered()
  elsewhere.postMessage({ key: 'set-elsewhere', from: 'another tab' })
  await delivered()

  assert.equal(told, 2)
  assert.equal(readStoredText('set-elsewhere', 'bs'), undefined)
})

test('a kept cookie is what is read, and nothing set yet reads as the page started', (t) => {
  aPage(t, { keepsCookies: true })

  assert.equal(readStoredText('kept', 'bs'), 'bs')

  storeText('kept', 'bh')

  assert.equal(readStoredText('kept', 'bs'), 'bh')
})
