import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, waitFor } from 'storybook/test'

import { Curtain, askForTheCurtain } from '@/components/vela/curtain'

const meta = {
  title: 'Components/幕',
  component: Curtain,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Curtain>

export default meta

type Story = StoryObj<typeof meta>

function curtainOf(canvasElement: HTMLElement): Element | null {
  return canvasElement.ownerDocument.querySelector('[data-slot="curtain"]')
}

export const 上がり終わると片付く: Story = {
  beforeEach: () => {
    document.documentElement.dataset.motion = 'moves'
    askForTheCurtain()

    return () => {
      delete document.documentElement.dataset.motion
    }
  },
  play: async ({ canvasElement }) => {
    await expect(curtainOf(canvasElement)).not.toBeNull()
    await waitFor(() => expect(curtainOf(canvasElement)).toBeNull(), {
      timeout: 3000,
    })
  },
}

export const 動きを切っていると幕を立てない: Story = {
  beforeEach: () => {
    document.documentElement.dataset.motion = 'still'
    askForTheCurtain()

    return () => {
      delete document.documentElement.dataset.motion
    }
  },
  play: async ({ canvasElement }) => {
    await expect(curtainOf(canvasElement)).toBeNull()
    await expect(window.sessionStorage.getItem('vela.curtain')).toBeNull()
  },
}
