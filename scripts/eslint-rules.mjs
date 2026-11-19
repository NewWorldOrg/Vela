
const DIRECTIVES = [
  /^\s*eslint-(?:disable|enable|env)\b/,
  /^\s*(?:global|globals|exported)\s/,
  /^\s*@ts-(?:expect-error|ignore|nocheck|check)\b/,
  /^\/\s*<reference\s/,
  /^\s*prettier-ignore\b/,
  /^\s*(?:webpack|turbopack)[A-Za-z]*\s*:/,
  /^\s*[@#]__(?:PURE|NO_SIDE_EFFECTS)__\s*$/,
]

const PLAIN_SCRIPT = /\.(?:m?js|cjs)$/

const TYPE_ANNOTATION = /^\*\s*@(?:type|satisfies)\s/

const PARTS = ['test', 'consequent', 'alternate']

const DIRECTIVE = /^\s*eslint-disable(?:-next-line|-line)?\s/

const REASON_FOLLOWS = /\s-{2,}\s/

function chained(node) {
  let count = 1

  for (const part of PARTS) {
    if (node[part].type === 'ConditionalExpression') {
      count += chained(node[part])
    }
  }

  return count
}

function waivesWithoutReason(comment, ruleId) {
  const [directive, ...reason] = comment.value.split(REASON_FOLLOWS)

  return (
    DIRECTIVE.test(directive) &&
    directive.includes(ruleId) &&
    reason.join('').trim() === ''
  )
}

const maxTernaryChain = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Limit how many ternaries are chained into one expression',
    },
    schema: [
      {
        type: 'object',
        properties: { max: { type: 'integer', minimum: 1 } },
        additionalProperties: false,
      },
    ],
    messages: {
      tooMany:
        '{{count}} ternaries are chained into one expression, and {{max}} is the most one may hold. Give two axes a named table, or move the steps into a function that returns early.',
      noReason:
        'This lets a longer chain of ternaries through without saying why. Write the reason after `--`.',
    },
  },
  create(context) {
    const max = context.options[0]?.max ?? 2

    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (waivesWithoutReason(comment, context.id)) {
            context.report({ loc: comment.loc, messageId: 'noReason' })
          }
        }
      },
      ConditionalExpression(node) {
        if (node.parent.type === 'ConditionalExpression') {
          return
        }

        const count = chained(node)

        if (count > max) {
          context.report({ node, messageId: 'tooMany', data: { count, max } })
        }
      },
    }
  },
}

function isRead(comment, filename) {
  if (comment.type === 'Shebang') {
    return true
  }

  if (DIRECTIVES.some((directive) => directive.test(comment.value))) {
    return true
  }

  return PLAIN_SCRIPT.test(filename) && TYPE_ANNOTATION.test(comment.value)
}

const noComments = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Forbid comments other than the directives a tool reads',
    },
    schema: [],
    messages: {
      comment:
        'Code carries no comments. Say it in the names and the structure, or leave it out.',
    },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (!isRead(comment, context.filename)) {
            context.report({ loc: comment.loc, messageId: 'comment' })
          }
        }
      },
    }
  },
}

/** @type {import('eslint').ESLint.Plugin} */
const plugin = {
  rules: {
    'no-comments': noComments,
    'max-ternary-chain': maxTernaryChain,
  },
}

export default plugin
