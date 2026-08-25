/**
 * `@/` for the unit tests.
 *
 * `tsconfig.json` maps it and the bundler follows that map; Node reads no
 * tsconfig, so a test that reaches a module which imports by alias cannot
 * resolve it. Registering the same map here is what lets `repository/` be
 * tested at all — the modules there import one another by alias, and spelling
 * them relatively for the sake of the runner would be the runner deciding how
 * the source is written.
 *
 * The format is named for a TypeScript source so Node strips its types rather
 * than parsing it twice to find out it is not CommonJS.
 */
import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/**
 * Taken back off the URL rather than read off it: a URL path spells a space as
 * `%20`, and a checkout under such a name would leave every candidate below
 * unfindable and `@/` resolving to nothing at all.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

registerHooks({
  resolve(specifier, context, next) {
    if (!specifier.startsWith('@/')) {
      return next(specifier, context)
    }

    const asked = `${ROOT}/${specifier.slice(2)}`

    for (const candidate of [
      asked,
      `${asked}.ts`,
      `${asked}.tsx`,
      `${asked}/index.ts`,
    ]) {
      if (!existsSync(candidate)) {
        continue
      }

      return {
        url: pathToFileURL(candidate).href,
        format: /\.tsx?$/.test(candidate) ? 'module-typescript' : undefined,
        shortCircuit: true,
      }
    }

    return next(specifier, context)
  },
})
