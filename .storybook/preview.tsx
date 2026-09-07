import type { Preview } from '@storybook/nextjs'
import { useEffect } from 'react'
import '../app/globals.css'
import {
  ThemeProvider,
  type ThemePreference,
} from '../components/theme/ThemeProvider'

const REQUESTED_THEME =
  typeof location === 'undefined'
    ? null
    : new URLSearchParams(location.search).get('theme')

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
