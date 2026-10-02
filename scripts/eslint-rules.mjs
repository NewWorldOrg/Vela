/** The lint rules this repository keeps for itself. `eslint.config.mjs` loads them as the `vela` plugin. */

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

/**
 * Counts the ternaries joined directly, one as the test or a branch of the next, and stops the chain at `max`.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
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

/** @type {import('eslint').ESLint.Plugin} */
const plugin = {
  rules: {
    'max-ternary-chain': maxTernaryChain,
  },
}

export default plugin
