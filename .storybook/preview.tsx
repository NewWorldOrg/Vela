import type { Preview } from '@storybook/nextjs'
import { useEffect } from 'react'
import '../app/globals.css'
import {
  ThemeProvider,
  type ThemePreference,
} from '../components/theme/ThemeProvider'

/**
 * A theme asked for on the preview's own query string, which outranks the
 * toolbar global. The test-runner renders every story inside a single page
 * load, so it never reaches the toolbar; asking on the one URL it does load is
 * how a whole run is held to one theme. Read once, at module scope, because
 * that URL does not change for the life of the run.
 */
const REQUESTED_THEME =
  typeof location === 'undefined'
    ? null
    : new URLSearchParams(location.search).get('theme')

/**
 * Applies the `dark` class to the preview document based on the Storybook
 * toolbar `theme` global, then wraps the story in the app's ThemeProvider so
 * theme-aware components (e.g. ThemeToggle) have their context.
 *
 * ThemeProvider only toggles the class itself when the preference is `system`
 * (or on user selection); in the real app the SSR layout sets the initial
 * `dark` class on <html>. Storybook has no such SSR step, so we set it here.
 */
function WithTheme({
  theme,
  children,
}: {
  theme: ThemePreference
  children: React.ReactNode
}) {
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return <ThemeProvider initialPreference={theme}>{children}</ThemeProvider>
}

const preview: Preview = {
  parameters: {
    // Tokens first, then the Vela components, then the untouched primitives.
    options: {
      storySort: {
        order: ['Foundations', 'Components', 'UI'],
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    nextjs: {
      appDirectory: true,
    },
    a11y: {
      // Every story must be clean: the test-runner fails on any violation.
      test: 'error',
    },
  },
  globalTypes: {
    theme: {
      description: 'Theme',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'sun',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme: ThemePreference =
        (REQUESTED_THEME ?? context.globals.theme) === 'dark' ? 'dark' : 'light'
      return (
        <WithTheme theme={theme}>
          <Story />
        </WithTheme>
      )
    },
  ],
}

export default preview
