import type { Preview } from '@storybook/nextjs'
import { useEffect } from 'react'
import '../app/globals.css'
import {
  ThemeProvider,
  type ThemePreference,
} from '../components/theme/ThemeProvider'

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
    // Surface the composed screens and layout first; raw primitives last.
    options: {
      storySort: {
        order: ['Pages', 'Layout', 'Common', 'Forms', 'Theme', 'UI'],
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
      // Surface a11y violations in the UI/CI without failing the run yet.
      test: 'todo',
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
        context.globals.theme === 'dark' ? 'dark' : 'light'
      return (
        <WithTheme theme={theme}>
          <Story />
        </WithTheme>
      )
    },
  ],
}

export default preview
