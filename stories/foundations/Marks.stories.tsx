import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect } from 'storybook/test'

import { Brand } from '@/components/vela/app-shell'
import { VelaMark } from '@/components/vela/marks'
import { SectionHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'

const meta = {
  title: 'Foundations/Marks',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function tokenOf(name: string): string {
  const probe = document.createElement('span')
  probe.style.color = `var(${name})`
  document.body.append(probe)
  const colour = getComputedStyle(probe).color
  probe.remove()
  return colour
}

export const しるし: Story = {
  render: () => (
    <div className="mx-auto max-w-[760px] p-6">
      <SectionHeading>しるし</SectionHeading>
      <Surface className="flex flex-wrap items-end gap-6">
        <VelaMark className="size-[140px]" />
        <VelaMark className="size-[34px]" />
        <VelaMark className="size-6" />
        <Brand />
      </Surface>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const marks = [
      ...canvasElement.querySelectorAll<SVGSVGElement>(
        '[data-slot="vela-mark"]',
      ),
    ]

    await expect(marks).toHaveLength(4)

    for (const mark of marks) {
      const strokes = [...mark.querySelectorAll(':scope > path')]
      const dot = mark.querySelector(':scope > circle')

      await expect(strokes).toHaveLength(2)

      for (const stroke of strokes) {
        await expect(getComputedStyle(stroke).stroke).toBe(tokenOf('--ink'))
      }

      await expect(getComputedStyle(dot!).fill).toBe(tokenOf('--accent'))
      await expect(mark).toHaveAttribute('aria-hidden', 'true')
    }
  },
}
