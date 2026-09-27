/** Resolves `@/` to the repository root for the unit tests. */
import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

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
