import type { Meta, StoryObj } from '@storybook/nextjs'
import { useCallback } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { expect, waitFor } from 'storybook/test'

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

function theGround(): string {
  const probe = document.createElement('span')

  probe.style.backgroundColor = 'var(--bg)'
  document.body.append(probe)
  const ground = getComputedStyle(probe).backgroundColor

  probe.remove()

  return ground
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
    await expect(getComputedStyle(curtain!).backgroundColor).toBe(theGround())
    await expect(
      curtain!.querySelectorAll(':scope > [data-slot="vela-mark"]'),
    ).toHaveLength(1)
    await expect(curtain!.querySelectorAll('svg')).toHaveLength(1)

    const movements = curtain!.getAnimations({ subtree: true })

    await expect(
      movements.map((running) =>
        'animationName' in running ? running.animationName : '',
      ),
    ).toEqual(['curtain-lift'])
    await expect(
      Number(movements[0].effect?.getComputedTiming().duration),
    ).toBe(140)

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

    await expect(getComputedStyle(curtain!).opacity).toBe('0')
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
