import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { Linter } from 'eslint'

import vela from '@/scripts/eslint-rules.mjs'

const RULE = 'vela/no-comments'

const NOT_WRITTEN_HERE = new Set([
  'node_modules',
  '.next',
  '.git',
  'storybook-static',
])

function said(code: string, filename = 'a.js'): number[] {
  const linter = new Linter({ configType: 'flat' })

  return linter
    .verify(
      code,
      [
        {
          files: ['**/*.js', '**/*.mjs', '**/*.ts'],
          plugins: { vela },
          languageOptions: {
            parserOptions: { ecmaFeatures: { jsx: true } },
          },
          rules: { [RULE]: 'error' },
        },
      ],
      { filename },
    )
    .filter((one) => one.ruleId === RULE)
    .map((one) => one.line)
}

function stylesheets(from: string): string[] {
  return readdirSync(from, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(from, entry.name)

    if (entry.isDirectory()) {
      return NOT_WRITTEN_HERE.has(entry.name) ? [] : stylesheets(full)
    }

    return entry.name.endsWith('.css') ? [full] : []
  })
}

function commentsIn(css: string): number {
  let found = 0
  let at = 0

  while (at < css.length) {
    const here = css[at]

    if (here === '"' || here === "'") {
      at++

      while (css[at] !== here) {
        at += css[at] === '\\' ? 2 : 1
      }

      at++
    } else if (css.startsWith('url(', at)) {
      at = css.indexOf(')', at) + 1
    } else if (css.startsWith('/*', at)) {
      found++
      at = css.indexOf('*/', at + 2) + 2
    } else {
      at++
    }
  }

  return found
}

test('a line comment, a block comment, a doc comment and a comment in JSX are each said', () => {
  assert.deepEqual(said('// a\nconst x = 1'), [1])
  assert.deepEqual(said('const x = 1 /* a */'), [1])
  assert.deepEqual(said('const x = 1\n/** a */\nconst y = 2'), [2])
  assert.deepEqual(said('const x = <div>{/* a */}</div>'), [1])
})

test('the directives a tool reads pass', () => {
  assert.deepEqual(said('// eslint-disable-next-line no-undef\nx()'), [])
  assert.deepEqual(said('/* eslint-disable no-undef */\nx()'), [])
  assert.deepEqual(said('// @ts-expect-error\nx()'), [])
  assert.deepEqual(said('// @ts-ignore\nx()'), [])
  assert.deepEqual(said('/// <reference types="node" />\nx()'), [])
  assert.deepEqual(said('// prettier-ignore\nx()'), [])
  assert.deepEqual(said('x(import(/* webpackChunkName: "a" */ "./a"))'), [])
  assert.deepEqual(said('const x = /* @__PURE__ */ f()'), [])
  assert.deepEqual(said('#!/usr/bin/env node\nx()'), [])
})

test('a type annotation passes in a plain script and is said anywhere else', () => {
  const code = '/** @type {import("x").Y} */\nconst x = {}'

  assert.deepEqual(said(code, 'a.mjs'), [])
  assert.deepEqual(said(code, 'a.ts'), [1])
})

test('the stylesheets carry no comment', () => {
  const sheets = stylesheets(process.cwd())

  assert.ok(sheets.length > 0)
  assert.deepEqual(
    sheets.filter((sheet) => commentsIn(readFileSync(sheet, 'utf8')) > 0),
    [],
  )
})

test('the stylesheet reader skips a comment mark inside a string and inside a url', () => {
  assert.equal(commentsIn('a { content: "/* x */"; b: url(/*.png) }'), 0)
  assert.equal(commentsIn('a { b: c } /* x */'), 1)
})
