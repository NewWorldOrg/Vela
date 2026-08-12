import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * Vela's type scale lives in the `--text-*` namespace, so `text-ui`,
 * `text-note`, … are font sizes while `text-ink`, `text-on-btn`, … are colours.
 * tailwind-merge cannot tell them apart on its own and would silently drop one
 * of the two whenever both appear (which is every button and badge), so the
 * size names are declared explicitly here.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'h1',
            'h2',
            'h3',
            'title',
            'body',
            'ui',
            'sub',
            'note',
            'cap',
            'micro',
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
