import type { Page } from 'playwright'
import { type TestRunnerConfig, getStoryContext } from '@storybook/test-runner'

/**
 * The size a story asks the browser to be. What a screen does at a width is
 * decided by media queries against the viewport, so a story about a width has
 * to move the viewport: a narrow box inside a wide window resolves every one
 * of those queries as the wide window and is a different screen from the one
 * being asked about.
 */
interface Screen {
  width: number
  height: number
}

/**
 * The size the runner opened the page at, handed back to every story that does
 * not ask for one of its own — the viewport is the one page's, and a story that
 * moved it would otherwise leave it moved for the rest of the run.
 *
 * Taken in `prepare`, which runs once before any story, rather than the first
 * time a story is visited: read late, the first reading could already be a size
 * some earlier story asked for, and that size would then become the one every
 * story is handed back. Held per worker, each of which drives a page of its own.
 */
let opened: Screen | null = null

/**
 * Carries the theme a run is held to into the preview.
 *
 * The runner loads `iframe.html` once and then renders every story inside that
 * same page, so there is no per-story URL and no way to reach the toolbar
 * global. The theme therefore rides on the query string of the single
 * navigation, where `.storybook/preview.tsx` reads it. Only `prepare` can shape
 * that URL, so it is reproduced here rather than extended.
 *
 * The story id is deliberately left off: naming one makes the preview resolve a
 * selection during boot and the page the runner has just taken hold of is
 * replaced under it, which fails every story with a destroyed execution
 * context.
 */
const config: TestRunnerConfig = {
  async prepare({ page, browserContext, testRunnerConfig }) {
    const target = process.env.TARGET_URL
    if (!target) {
      throw new Error('TARGET_URL is not set')
    }

    const url = new URL('iframe.html', target)
    url.searchParams.set('theme', process.env.STORYBOOK_THEME ?? 'light')
    const href = url.toString()

    if (testRunnerConfig?.getHttpHeaders) {
      await browserContext.setExtraHTTPHeaders(
        await testRunnerConfig.getHttpHeaders(href),
      )
    }

    await page.goto(href, { waitUntil: 'load' })

    opened = page.viewportSize()
  },

  async preVisit(page: Page, context) {
    const { parameters } = await getStoryContext(page, context)
    const asked: Screen | undefined = (parameters as { screen?: Screen }).screen
    const size: Screen | null = asked ?? opened

    if (size) {
      await page.setViewportSize(size)
    }
  },
}

export default config
