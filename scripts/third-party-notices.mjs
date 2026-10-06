import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const texts = join(root, 'scripts/third-party-notices')
const built = join(root, '.next')
const traced = join(built, 'standalone')
const notices = join(root, 'THIRD-PARTY-NOTICES.md')
const tableHeading = '## npm packages'
const emittedByTheBuild = ['node_modules/tailwindcss']
const licenseFile = /^(licen[cs]e|copying|notice)|\.legal\.txt$/i

function fail(message) {
  console.error(message)
  process.exit(1)
}

const out = process.argv[2]
  ? resolve(process.argv[2])
  : fail('usage: node scripts/third-party-notices.mjs <output directory>')

function filesUnder(directory) {
  if (!existsSync(directory)) {
    return []
  }

  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function packageDirectoryOf(path) {
  const segments = path.split('/')
  const last = segments.lastIndexOf('node_modules')

  if (last < 0 || last + 1 >= segments.length) {
    return null
  }

  const width = segments[last + 1].startsWith('@') ? 2 : 1
  const directory = segments.slice(0, last + 1 + width)
  const rest = segments.slice(last + 1 + width)
  const vendored =
    directory.at(-1) === 'next' && rest[0] === 'dist' && rest[1] === 'compiled'

  if (!vendored || rest.length < 4) {
    return directory.join('/')
  }

  const vendoredWidth = rest[2].startsWith('@') ? 2 : 1

  return [...directory, ...rest.slice(0, 2 + vendoredWidth)].join('/')
}

function projectPathOf(source, map) {
  const decoded = decodeURIComponent(source)
  const project = decoded.match(/^turbopack:\/\/\/\[project\]\/(.*)$/)

  if (project) {
    return project[1]
  }

  if (/^[a-z]+:/i.test(decoded)) {
    return null
  }

  return relative(root, resolve(dirname(map), decoded))
}

function sourcesOf(map) {
  const parsed = readJson(map)
  const parts = parsed.sections
    ? parsed.sections.map((section) => section.map)
    : [parsed]

  return parts.flatMap((part) => part.sources ?? [])
}

function bundledPackages() {
  const found = new Set()
  const unattributed = new Set()
  const maps = [join(built, 'static'), join(built, 'server')]
    .flatMap(filesUnder)
    .filter((file) => file.endsWith('.map'))

  if (maps.length === 0) {
    fail('the build left no source maps, so what it bundled cannot be told')
  }

  for (const map of maps) {
    for (const source of sourcesOf(map)) {
      const path = projectPathOf(source, map)

      if (path === null || !path.split('/').includes('node_modules')) {
        continue
      }

      const directory = packageDirectoryOf(path)

      if (!path.startsWith('..') && existsSync(join(root, directory))) {
        found.add(directory)
      } else {
        unattributed.add(source)
      }
    }
  }

  for (const source of unattributed) {
    console.warn(`a source map names a file outside the project: ${source}`)
  }

  return found
}

function unmappedChunkOwners() {
  const verbatim = new Map(
    filesUnder(join(root, 'node_modules/next/dist/build/polyfills')).map(
      (file) => [readFileSync(file, 'utf8'), 'node_modules/next'],
    ),
  )

  return filesUnder(join(built, 'static/chunks'))
    .filter((file) => file.endsWith('.js'))
    .filter(
      (file) => !readFileSync(file, 'utf8').includes('//# sourceMappingURL='),
    )
    .map(
      (file) =>
        verbatim.get(readFileSync(file, 'utf8')) ??
        fail(
          `${relative(root, file)} has no source map, so what it carries cannot be told`,
        ),
    )
}

function tracedPackages() {
  const found = new Set()
  const visit = (directory) => {
    for (const entry of readdirSync(join(traced, directory), {
      withFileTypes: true,
    })) {
      if (!entry.isDirectory()) {
        continue
      }

      const path = `${directory}/${entry.name}`

      if (entry.name.startsWith('@')) {
        visit(path)
      } else if (existsSync(join(traced, path, 'package.json'))) {
        found.add(path)
        visitNested(path)
      }
    }
  }
  const visitNested = (directory) => {
    if (existsSync(join(traced, directory, 'node_modules'))) {
      visit(`${directory}/node_modules`)
    }
  }
  const visitVendored = (directory) => {
    for (const entry of readdirSync(join(traced, directory), {
      withFileTypes: true,
    })) {
      if (entry.isDirectory() && entry.name.startsWith('@')) {
        visitVendored(`${directory}/${entry.name}`)
      } else if (entry.isDirectory()) {
        found.add(`${directory}/${entry.name}`)
      }
    }
  }

  visit('node_modules')
  visitVendored('node_modules/next/dist/compiled')

  return found
}

function licenseOf(manifest) {
  const { license, licenses } = manifest

  if (typeof license === 'string') {
    return license
  }

  if (license?.type) {
    return license.type
  }

  if (Array.isArray(licenses) && licenses.length > 0) {
    return licenses.map((entry) => entry.type ?? entry).join(' OR ')
  }

  return null
}

function nameOf(directory) {
  const segments = directory.split('/')

  return segments.at(-2).startsWith('@')
    ? segments.slice(-2).join('/')
    : segments.at(-1)
}

function licenseFilesIn(directory) {
  const entries = readdirSync(directory, { withFileTypes: true })
  const own = entries
    .filter((entry) => entry.isFile() && licenseFile.test(entry.name))
    .map((entry) => entry.name)
  const inParts = entries
    .filter((entry) => entry.isDirectory() && entry.name !== 'node_modules')
    .flatMap((entry) =>
      readdirSync(join(directory, entry.name), { withFileTypes: true })
        .filter((file) => file.isFile() && licenseFile.test(file.name))
        .map((file) => `${entry.name}/${file.name}`),
    )

  return [...own, ...inParts]
}

function describe(directory) {
  const manifestFile = join(root, directory, 'package.json')
  const manifest = existsSync(manifestFile) ? readJson(manifestFile) : {}

  const files = licenseFilesIn(join(root, directory))
  const license = licenseOf(manifest)

  return {
    directory,
    name: manifest.name ?? nameOf(directory),
    version: manifest.version ?? '-',
    license,
    label:
      license ?? (files.length > 0 ? 'as its license file states' : 'unstated'),
    author: manifest.author?.name ?? manifest.author ?? null,
    vendored: directory.includes('/next/dist/compiled/'),
    files,
  }
}

function writtenLicense(record) {
  const override = join(texts, 'npm', `${record.name}.txt`)

  if (existsSync(override)) {
    return readFileSync(override, 'utf8')
  }

  const template = join(texts, 'spdx', `${record.license}.txt`)

  if (!record.license || !existsSync(template) || !record.author) {
    fail(
      `${record.name} ${record.version} carries no license file, and its package.json does not name both a license with a text at scripts/third-party-notices/spdx/ and an author: put its license at scripts/third-party-notices/npm/${record.name}.txt`,
    )
  }

  return `${record.name} ${record.version} states its license as ${record.license}, by ${record.author}, and carries no license file.\n\n${readFileSync(template, 'utf8')}`
}

function write(record, destination) {
  mkdirSync(destination, { recursive: true })

  for (const file of record.files) {
    mkdirSync(dirname(join(destination, file)), { recursive: true })
    copyFileSync(join(root, record.directory, file), join(destination, file))
  }

  if (
    record.vendored &&
    existsSync(join(root, record.directory, 'package.json'))
  ) {
    copyFileSync(
      join(root, record.directory, 'package.json'),
      join(destination, 'package.json'),
    )
  }

  const override = existsSync(join(texts, 'npm', `${record.name}.txt`))

  if (override || record.files.length === 0) {
    writeFileSync(join(destination, 'LICENSE'), writtenLicense(record))
  }
}

function declaredRows() {
  const lines = readFileSync(notices, 'utf8').split('\n')
  const opened = lines.indexOf(tableHeading)

  if (opened < 0) {
    fail(`THIRD-PARTY-NOTICES.md has no '${tableHeading}' section`)
  }

  const closed = lines.findIndex(
    (line, index) => index > opened && line.startsWith('## '),
  )

  return lines
    .slice(opened + 1, closed < 0 ? undefined : closed)
    .filter((line) => line.startsWith('| `'))
    .map((line) =>
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim().replaceAll('`', ''))
        .join('\t'),
    )
}

function compare(declared, carried) {
  const listedOnly = declared.filter((row) => !carried.includes(row))
  const carriedOnly = carried.filter((row) => !declared.includes(row))

  if (listedOnly.length + carriedOnly.length === 0) {
    return
  }

  fail(
    [
      `the '${tableHeading}' table of THIRD-PARTY-NOTICES.md is not what the image carries (< listed only, > carried only):`,
      ...listedOnly.map((row) => `< ${row}`),
      ...carriedOnly.map((row) => `> ${row}`),
    ].join('\n'),
  )
}

function fonts() {
  const directory = join(root, 'public/fonts')

  for (const font of existsSync(directory) ? readdirSync(directory) : []) {
    const text = join(texts, 'fonts', `${font}.txt`)

    if (!existsSync(text)) {
      fail(
        `public/fonts/${font} has no license at scripts/third-party-notices/fonts/${font}.txt`,
      )
    }

    mkdirSync(join(out, 'fonts'), { recursive: true })
    copyFileSync(text, join(out, 'fonts', `${font}.txt`))
  }
}

function runtime() {
  const license = resolve(dirname(process.execPath), '../LICENSE')

  if (!existsSync(license)) {
    fail(`the Node.js running this build keeps no license at ${license}`)
  }

  mkdirSync(join(out, 'node'), { recursive: true })
  copyFileSync(license, join(out, 'node', 'LICENSE'))
}

function main() {
  const directories = new Set([
    ...tracedPackages(),
    ...bundledPackages(),
    ...unmappedChunkOwners(),
    ...emittedByTheBuild,
  ])
  const records = [...directories].sort().map(describe)
  const next = records.find(
    (record) => record.directory === 'node_modules/next',
  )
  const rows = (vendored) =>
    records
      .filter((record) => record.vendored === vendored)
      .map((record) => [record.name, record.version, record.label].join('\t'))

  for (const record of records) {
    write(
      record,
      record.vendored
        ? join(out, 'npm/next', next.version, 'compiled', record.name)
        : join(out, 'npm', record.name, record.version),
    )
  }

  writeFileSync(join(out, 'npm/packages.tsv'), `${rows(false).join('\n')}\n`)
  writeFileSync(
    join(out, 'npm/next', next.version, 'compiled/packages.tsv'),
    `${rows(true).join('\n')}\n`,
  )

  const carried = [
    ...new Set(
      records
        .filter((record) => !record.vendored)
        .map((record) => `${record.name}\t${record.label}`),
    ),
  ].sort()

  compare(declaredRows().sort(), carried)
  fonts()
  runtime()

  for (const file of ['LICENSE', 'THIRD-PARTY-NOTICES.md']) {
    copyFileSync(join(root, file), join(out, file))
  }

  console.log(
    `THIRD-PARTY-NOTICES.md lists the ${carried.length} npm packages the image carries, beside ${rows(true).length} that Next.js carries in dist/compiled`,
  )
}

main()
