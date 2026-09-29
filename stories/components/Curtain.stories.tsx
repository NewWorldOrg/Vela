import type { Meta, StoryObj } from '@storybook/nextjs'
import { useCallback } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { expect, waitFor } from 'storybook/test'

import { FOLDS_ON_A_SIDE } from '@/lib/curtain'
import { Curtain } from '@/components/vela/curtain'

function FromTheServer() {
  const hydrated = useCallback((node: HTMLDivElement | null) => {
    if (node === null) {
      return
    }

    node.innerHTML = renderToString(<Curtain />)
    const root = hydrateRoot(node, <Curtain />)

    return () => {
      setTimeout(() => root.unmount(), 0)
    }
  }, [])

  return <div ref={hydrated} />
}

const meta = {
  title: 'Components/幕',
  component: Curtain,
  parameters: { layout: 'fullscreen' },
  render: () => <FromTheServer />,
} satisfies Meta<typeof Curtain>

export default meta

type Story = StoryObj<typeof meta>

function curtainOf(canvasElement: HTMLElement): HTMLElement | null {
  return canvasElement.ownerDocument.querySelector<HTMLElement>(
    '[data-slot="curtain"]',
  )
}

function movingWith(motion: string) {
  return () => {
    document.documentElement.dataset.motion = motion

    return () => {
      delete document.documentElement.dataset.motion
    }
  }
}

export const 閉じた形で描かれ上がり終わると片付く: Story = {
  beforeEach: movingWith('moves'),
  play: async ({ canvasElement }) => {
    const curtain = curtainOf(canvasElement)

    await expect(curtain).not.toBeNull()
    await expect(getComputedStyle(curtain!).display).not.toBe('none')
    await expect(getComputedStyle(curtain!).pointerEvents).toBe('none')
    await expect(curtain!.querySelectorAll('.curtain-fold')).toHaveLength(
      FOLDS_ON_A_SIDE * 2,
    )
    await expect(
      curtain!.querySelectorAll('[data-slot="usher"]').length,
    ).toBeGreaterThan(0)

    await waitFor(() => expect(curtainOf(canvasElement)).toBeNull(), {
      timeout: 5000,
    })
  },
}

export const 開き終わった形は画面を覆わない: Story = {
  beforeEach: movingWith('moves'),
  play: async ({ canvasElement }) => {
    const curtain = curtainOf(canvasElement)

    await expect(curtain).not.toBeNull()

    for (const running of curtain!.getAnimations({ subtree: true })) {
      running.pause()
      running.currentTime = Number(running.effect?.getComputedTiming().endTime)
    }

    const screen = curtain!.getBoundingClientRect()
    const covering = [
      ...curtain!.querySelectorAll<HTMLElement>(
        '.curtain-fold-paint, .curtain-valance, .curtain-tassel, .curtain-tie-loop',
      ),
    ].filter((part) => {
      const drawn = part.getBoundingClientRect()

      return (
        drawn.right > screen.left + 1 &&
        drawn.left < screen.right - 1 &&
        drawn.bottom > screen.top + 1 &&
        drawn.top < screen.bottom - 1
      )
    })

    await expect(covering).toHaveLength(0)

    for (const faded of curtain!.querySelectorAll<HTMLElement>(
      '.curtain-usher-z, .curtain-twinkle, .curtain-dock-ring',
    )) {
      await expect(getComputedStyle(faded).opacity).toBe('0')
    }
  },
}

export const 動きを切っていると幕を立てない: Story = {
  beforeEach: movingWith('still'),
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(curtainOf(canvasElement)).toBeNull())
  },
}

export const 動きを減らす端末では幕を立てない: Story = {
  parameters: { lessMotion: true },
  play: async ({ canvasElement }) => {
    await expect(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    ).toBe(true)
    await waitFor(() => expect(curtainOf(canvasElement)).toBeNull())
  },
}

export const 画面の移動で組まれたときは幕を立てない: Story = {
  beforeEach: movingWith('moves'),
  render: () => <Curtain />,
  play: async ({ canvasElement }) => {
    await expect(curtainOf(canvasElement)).toBeNull()
    await new Promise((settled) => setTimeout(settled, 200))
    await expect(curtainOf(canvasElement)).toBeNull()
  },
}
